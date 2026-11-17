/**
 * Generates `src/lib/circuitLaps.ts`, the lap outlines the landing hero draws
 * behind the race name.
 *
 *   pnpm --filter @grandprixpicks/web generate-circuit-laps
 *
 * Every outline is OpenStreetMap's (ODbL), fetched once from Overpass and
 * committed under `artifacts/circuit-laps/raw/` so the output is reproducible.
 * The query for each circuit is beside its entry below. To add a circuit:
 * fetch its raw file, add an entry, run this, then format the output.
 *
 * The lap is found rather than declared. The raw ways are a circuit's whole
 * raceway network (pit lanes, karting tracks, alternative layouts), so the
 * script searches it for the one closed loop of the official length, honouring
 * each way's one-way direction, which on a circuit is the direction of the
 * race. It then checks that loop runs the way the race does, starts it at the
 * start/finish line, turns it landscape and simplifies it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, '../../../artifacts/circuit-laps/raw');
const OUT = join(HERE, '../src/lib/circuitLaps.ts');

const WIDTH = 1000;
const SIMPLIFY_EPSILON = 0.8;

type LatLon = { lat: number; lon: number };
type OsmWay = {
  type: 'way';
  id: number;
  geometry: LatLon[];
  tags?: Record<string, string>;
};
type OsmRelation = {
  type: 'relation';
  members: (
    | { type: 'way'; role: string; ref: number; geometry: LatLon[] }
    | { type: 'node'; role: string; lat: number; lon: number }
  )[];
};

type CircuitSource = {
  /** Circuit slug, as in `packages/shared/src/circuits.ts`. */
  slug: string;
  /** File under `artifacts/circuit-laps/raw/`. */
  file: string;
  /** Overpass query the file came from. */
  query: string;
  /** Official lap length, metres. OSM's loop must land within 2%. */
  lapMetres: number;
  direction: 'clockwise' | 'anticlockwise';
  /**
   * Where the line is: the circuit relation's own `start` node, or the middle
   * of a pit lane way (the line sits beside the pit building on every
   * circuit here).
   */
  startFinish: 'relation-start' | { pitLaneWayId: number };
  /** Ways that are not the race lap, by id, beyond the tag filter. */
  excludeWayIds?: readonly number[];
  /** Turned by this many degrees after the automatic landscape fit. */
  extraRotationDeg?: number;
};

const CIRCUITS: readonly CircuitSource[] = [
  {
    slug: 'las-vegas',
    file: 'las-vegas.json',
    // A street circuit: its roads are public highways, so the lap is the
    // circuit relation's forward and backward members, not raceway ways.
    query: '[out:json];relation(16696508);out geom;',
    lapMetres: 6201,
    direction: 'anticlockwise',
    startFinish: 'relation-start',
    extraRotationDeg: 180,
  },
  {
    slug: 'lusail',
    file: 'lusail.json',
    query:
      '[out:json];way["highway"="raceway"](25.475,51.44,25.505,51.465);out geom tags;',
    lapMetres: 5419,
    direction: 'clockwise',
    startFinish: { pitLaneWayId: 196193732 },
  },
  {
    slug: 'yas-marina',
    file: 'yas-marina.json',
    query:
      '[out:json];way["highway"="raceway"](24.455,54.59,24.485,54.615);out geom tags;',
    lapMetres: 5281,
    direction: 'anticlockwise',
    startFinish: { pitLaneWayId: 188471238 },
  },
];

type Point = readonly [number, number];

function key(p: LatLon): string {
  return `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
}

function projector(origin: LatLon) {
  const metresPerDegree = 111_320;
  const cos = Math.cos((origin.lat * Math.PI) / 180);
  return (p: LatLon): Point => [
    p.lon * metresPerDegree * cos,
    -p.lat * metresPerDegree,
  ];
}

function length(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(
      points[i]![0] - points[i - 1]![0],
      points[i]![1] - points[i - 1]![1],
    );
  }
  return total;
}

/** Raceway ways, or a circuit relation's lap members, as directed edges. */
function readWays(source: CircuitSource): { ways: OsmWay[]; start?: LatLon } {
  const raw = JSON.parse(readFileSync(join(RAW, source.file), 'utf8')) as {
    elements: (OsmWay | OsmRelation)[];
  };
  const relation = raw.elements.find(
    (element): element is OsmRelation => element.type === 'relation',
  );
  if (relation) {
    const ways = relation.members.flatMap((member, index) =>
      member.type === 'way' &&
      (member.role === 'forward' || member.role === 'backward')
        ? [
            {
              type: 'way' as const,
              id: index,
              geometry:
                member.role === 'backward'
                  ? [...member.geometry].reverse()
                  : member.geometry,
              tags: { oneway: 'yes' },
            },
          ]
        : [],
    );
    const start = relation.members.find(
      (member) => member.type === 'node' && member.role === 'start',
    );
    return {
      ways,
      start:
        start && start.type === 'node'
          ? { lat: start.lat, lon: start.lon }
          : undefined,
    };
  }
  const ways = raw.elements.filter(
    (way): way is OsmWay =>
      way.type === 'way' &&
      way.tags?.sport === 'motor' &&
      !/pit|penalty/i.test(way.tags.name ?? '') &&
      !source.excludeWayIds?.includes(way.id),
  );
  return { ways };
}

/**
 * The closed loop of the official length. One-way ways are walked only in
 * their own direction; the rest either way.
 */
function findLap(
  ways: OsmWay[],
  target: number,
  project: (p: LatLon) => Point,
) {
  type Edge = { to: string; points: Point[]; metres: number };
  const edges = new Map<string, Edge[]>();
  function add(from: string, edge: Edge) {
    edges.set(from, [...(edges.get(from) ?? []), edge]);
  }
  for (const way of ways) {
    const points = way.geometry.map(project);
    const metres = length(points);
    const [first, last] = [key(way.geometry[0]!), key(way.geometry.at(-1)!)];
    add(first, { to: last, points, metres });
    if (way.tags?.oneway !== 'yes') {
      add(last, { to: first, points: [...points].reverse(), metres });
    }
  }

  const [low, high] = [target * 0.98, target * 1.02];
  let best: { points: Point[]; metres: number } | null = null;
  for (const origin of edges.keys()) {
    const stack: {
      node: string;
      path: Edge[];
      metres: number;
      seen: Set<string>;
    }[] = [{ node: origin, path: [], metres: 0, seen: new Set([origin]) }];
    while (stack.length > 0) {
      const { node, path, metres, seen } = stack.pop()!;
      for (const edge of edges.get(node) ?? []) {
        const total = metres + edge.metres;
        if (total > high) {
          continue;
        }
        if (edge.to === origin) {
          if (
            total >= low &&
            (!best || Math.abs(total - target) < Math.abs(best.metres - target))
          ) {
            const points: Point[] = [];
            for (const step of [...path, edge]) {
              points.push(
                ...(points.length === 0 ? step.points : step.points.slice(1)),
              );
            }
            best = { points: points.slice(0, -1), metres: total };
          }
          continue;
        }
        if (!seen.has(edge.to)) {
          stack.push({
            node: edge.to,
            path: [...path, edge],
            metres: total,
            seen: new Set([...seen, edge.to]),
          });
        }
      }
    }
  }
  if (!best) {
    throw new Error(`no closed lap within 2% of ${target} m`);
  }
  return best;
}

/** Positive is clockwise on screen (y runs down). */
function signedArea(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [a, b] = [points[i]!, points[(i + 1) % points.length]!];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum;
}

function rotate(points: readonly Point[], degrees: number): Point[] {
  const r = (degrees * Math.PI) / 180;
  return points.map(([x, y]) => [
    x * Math.cos(r) - y * Math.sin(r),
    x * Math.sin(r) + y * Math.cos(r),
  ]);
}

function aspect(points: readonly Point[]): number {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return (
    (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs))
  );
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  if (dx === 0 && dy === 0) {
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const c = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + c * dx), p[1] - (a[1] + c * dy));
}

/** Ramer-Douglas-Peucker, iterative. */
function simplify(points: Point[], epsilon: number): Point[] {
  const keep = points.map(() => false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpendicularDistance(
        points[i]!,
        points[first]!,
        points[last]!,
      );
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > epsilon && index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function build(source: CircuitSource) {
  const { ways, start } = readWays(source);
  const origin = ways[0]!.geometry[0]!;
  const project = projector(origin);
  const lap = findLap(ways, source.lapMetres, project);
  let points = lap.points;

  // y runs down, so a positive area is clockwise as drawn.
  const clockwise = signedArea(points) > 0;
  if (clockwise !== (source.direction === 'clockwise')) {
    throw new Error(
      `${source.slug}: the one-way ways run ${clockwise ? 'clockwise' : 'anticlockwise'}, the race runs ${source.direction}`,
    );
  }

  const line =
    source.startFinish !== 'relation-start'
      ? (() => {
          const raw = JSON.parse(
            readFileSync(join(RAW, source.file), 'utf8'),
          ) as {
            elements: OsmWay[];
          };
          const pit = raw.elements.find(
            (way) =>
              way.id ===
              (source.startFinish as { pitLaneWayId: number }).pitLaneWayId,
          );
          if (!pit) {
            throw new Error(`${source.slug}: pit lane way not in the raw file`);
          }
          return pit.geometry[Math.floor(pit.geometry.length / 2)]!;
        })()
      : start;
  if (!line) {
    throw new Error(`${source.slug}: the relation has no start node`);
  }
  const [lx, ly] = project(line);
  const nearest = points.reduce(
    (best, p, i) => {
      const d = Math.hypot(p[0] - lx, p[1] - ly);
      return d < best.d ? { i, d } : best;
    },
    { i: 0, d: Infinity },
  ).i;
  points = [...points.slice(nearest), ...points.slice(0, nearest)];

  // Landscape: the turn that makes the lap flattest, then any extra turn the
  // layout reads better at. Turning keeps the direction of travel.
  let bestAngle = 0;
  for (let angle = 0; angle < 180; angle += 1) {
    if (aspect(rotate(points, angle)) < aspect(rotate(points, bestAngle))) {
      bestAngle = angle;
    }
  }
  points = rotate(points, bestAngle + (source.extraRotationDeg ?? 0));

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const scale = WIDTH / (Math.max(...xs) - minX);
  const scaled: Point[] = points.map(([x, y]) => [
    (x - minX) * scale,
    (y - minY) * scale,
  ]);
  const simplified = simplify([...scaled, scaled[0]!], SIMPLIFY_EPSILON);
  const d = `M${simplified
    .slice(0, -1)
    .map((p) => `${Math.round(p[0])} ${Math.round(p[1])}`)
    .join('L')}Z`;
  return {
    slug: source.slug,
    width: WIDTH,
    height: Math.round((Math.max(...ys) - minY) * scale),
    d,
    metres: Math.round(lap.metres),
  };
}

function render(laps: ReturnType<typeof build>[]) {
  return `/**
 * Lap outlines for the landing hero, keyed by circuit slug
 * (\`packages/shared/src/circuits.ts\`).
 *
 * GENERATED by \`scripts/generate-circuit-laps.mts\`. Do not edit by hand: the
 * outlines are © OpenStreetMap contributors (ODbL), from the raw files in
 * \`artifacts/circuit-laps/raw/\`.
 *
 * Decoration, not a map: the hero draws one behind the race name and it
 * carries no corners, sectors or markers. A circuit without an entry has no
 * outline, so this list only needs to keep up with the next race. Each path
 * runs in the direction of the race from the start/finish line, so the car
 * the hero sends round goes the right way.
 */

type CircuitLap = {
  width: number;
  height: number;
  /** One closed path in lap order, starting at the start/finish line. */
  d: string;
};

const CIRCUIT_LAPS: Record<string, CircuitLap> = {
${laps
  .map(
    (lap) => `  // OSM loop ${lap.metres} m.
  '${lap.slug}': {
    width: ${lap.width},
    height: ${lap.height},
    d: '${lap.d}',
  },`,
  )
  .join('\n')}
};

export function getCircuitLap(circuitSlug: string | undefined) {
  return circuitSlug ? (CIRCUIT_LAPS[circuitSlug] ?? null) : null;
}
`;
}

function main() {
  const laps = CIRCUITS.map(build);
  writeFileSync(OUT, render(laps));
  for (const lap of laps) {
    console.log(
      `${lap.slug}: ${lap.metres} m, ${lap.width}x${lap.height}, ${lap.d.length} chars`,
    );
  }
  console.log('Now run: pnpm exec oxfmt apps/web/src/lib/circuitLaps.ts');
}

main();
