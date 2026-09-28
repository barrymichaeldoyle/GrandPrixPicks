/**
 * Generates `src/lib/sepangCircuitGeometry.ts`, the Sepang lap map's geometry.
 *
 *   pnpm --filter @grandprixpicks/web generate-sepang-geometry
 *
 * The outline is OpenStreetMap's (ODbL, so the map credits it), fetched once
 * and committed under `artifacts/sepang-lap-map/raw/` with this query:
 *
 *   [out:json];way["highway"="raceway"](2.745,101.72,2.775,101.75);out geom tags;
 *
 * OpenF1's circuit outline, which Baku's map uses, had no entry for Sepang when
 * this was drawn. OSM's lap is within 0.2% of the official 5.543 km and the
 * layout has not changed since 1999, so there is nothing to swap to.
 *
 * The markers are not in OSM. They were read off the 2026 straight-mode map
 * published for the race, by fitting this outline onto it (3px mean error at
 * 1051px wide, so the two describe the same lap) and measuring each mark as
 * metres after the start/finish line. They are declared below as data, so a
 * revised map means editing numbers here, not redrawing anything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(
  HERE,
  '../../../artifacts/sepang-lap-map/raw/osm-raceway.json',
);
const OUT = join(HERE, '../src/lib/sepangCircuitGeometry.ts');

/** The F1 lap is 5.543 km. OSM's stitched loop measures 5.552. */
const LAP_LENGTH_RANGE = [5400, 5700] as const;
/** On the main straight, where the published map puts the chequer. */
const START_FINISH = { lat: 2.760773, lon: 101.738541 } as const;
/** Clockwise, north-up, matching the published map's orientation. */
const ROTATION_DEG = 4.7;

const WIDTH = 1000;
/** Room for the turn badges, which sit outside the lap. */
const PADDING = 48;
const SIMPLIFY_EPSILON = 0.4;
/** Display units between the track's centre and a turn badge's centre. */
const BADGE_GAP = 30;
/** Display units between the track's centre and a straight-mode zone. */
const ZONE_GAP = 17;

/** Metres after the line where sector 2 and sector 3 begin. */
const SECTOR_STARTS = [1452, 3300] as const;

type Side = 'left' | 'right';
/**
 * Each corner's apex as metres after the line, and which side of the track,
 * facing the way the lap runs, its badge sits on.
 */
const TURNS: readonly { number: number; m: number; side: Side }[] = [
  { number: 1, m: 696, side: 'left' },
  { number: 2, m: 820, side: 'right' },
  { number: 3, m: 1116, side: 'left' },
  { number: 4, m: 1568, side: 'right' },
  { number: 5, m: 1980, side: 'left' },
  { number: 6, m: 2220, side: 'left' },
  { number: 7, m: 2602, side: 'left' },
  { number: 8, m: 2720, side: 'left' },
  { number: 9, m: 3204, side: 'right' },
  { number: 10, m: 3318, side: 'left' },
  { number: 11, m: 3522, side: 'right' },
  { number: 12, m: 3922, side: 'left' },
  { number: 13, m: 4088, side: 'right' },
  { number: 14, m: 4268, side: 'left' },
  { number: 15, m: 5200, side: 'right' },
];

/**
 * Straight-mode zones as [from, to] metres after the line, drawn on the left
 * of the track as the published map draws them. The main straight's zone
 * crosses the line, so its start is larger than its end.
 */
const STRAIGHT_MODE_ZONES: readonly (readonly [number, number])[] = [
  [1214, 1522],
  [2780, 3084],
  [4348, 5120],
  [5330, 544],
];

const SPEED_TRAP_M = 4950;
const OVERTAKE_DETECTION_M = 5216;
const OVERTAKE_ACTIVATION_M = 5266;

type Point = readonly [number, number];
type OsmWay = {
  geometry: { lat: number; lon: number }[];
  tags?: Record<string, string>;
};

function key(p: { lat: number; lon: number }): string {
  return `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
}

/** Metres, x east and y south, so the lap is already in SVG orientation. */
function project(p: { lat: number; lon: number }): Point {
  const metresPerDegree = 111_320;
  const cos = Math.cos((START_FINISH.lat * Math.PI) / 180);
  return [p.lon * metresPerDegree * cos, -p.lat * metresPerDegree];
}

function length(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }
  return total;
}

/**
 * The raceway ways form the F1 lap plus the North/South Circuit shortcuts and
 * the pit lane. The F1 lap is the one closed loop of the right length.
 */
function stitchLap(ways: OsmWay[]): Point[] {
  const track = ways.filter(
    (w) =>
      w.tags?.sport === 'motor' &&
      !w.tags.name?.includes('Pit') &&
      w.tags.name !== 'Handling Circuit',
  );
  const fromNode = new Map<string, OsmWay[]>();
  for (const w of track) {
    const start = key(w.geometry[0]);
    fromNode.set(start, [...(fromNode.get(start) ?? []), w]);
  }
  function wayLength(w: OsmWay): number {
    return length(w.geometry.map(project));
  }

  for (const first of track) {
    const origin = key(first.geometry[0]);
    const stack: { node: string; path: OsmWay[]; metres: number }[] = [
      { node: origin, path: [], metres: 0 },
    ];
    while (stack.length > 0) {
      const { node, path, metres } = stack.pop()!;
      for (const w of fromNode.get(node) ?? []) {
        const next = key(w.geometry.at(-1)!);
        const total = metres + wayLength(w);
        if (next === origin) {
          if (total > LAP_LENGTH_RANGE[0] && total < LAP_LENGTH_RANGE[1]) {
            const points: Point[] = [];
            for (const way of [...path, w]) {
              const projected = way.geometry.map(project);
              points.push(
                ...(points.length === 0 ? projected : projected.slice(1)),
              );
            }
            return points.slice(0, -1);
          }
          continue;
        }
        const visited = path.some((p) => key(p.geometry[0]) === next);
        if (!visited && total < LAP_LENGTH_RANGE[1]) {
          stack.push({ node: next, path: [...path, w], metres: total });
        }
      }
    }
  }
  throw new Error('no closed lap of the expected length in the OSM data');
}

/** Evenly spaced points a metre apart, starting at the start/finish line. */
function resampleFromLine(lap: Point[]): Point[] {
  const line = project(START_FINISH);
  const nearest = lap.reduce(
    (best, p, i) => {
      const d = Math.hypot(p[0] - line[0], p[1] - line[1]);
      return d < best.d ? { i, d } : best;
    },
    { i: 0, d: Infinity },
  ).i;
  const closed = [...lap.slice(nearest), ...lap.slice(0, nearest + 1)];
  const out: Point[] = [];
  let carried = 0;
  for (let i = 1; i < closed.length; i += 1) {
    const [a, b] = [closed[i - 1], closed[i]];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (carried <= seg) {
      const t = carried / seg;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      carried += 1;
    }
    carried -= seg;
  }
  return out;
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  if (dx === 0 && dy === 0) {
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + clamped * dx), p[1] - (a[1] + clamped * dy));
}

/** Ramer-Douglas-Peucker, iterative so a long trace cannot blow the stack. */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) {
    return points;
  }
  const keep = points.map(() => false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpendicularDistance(points[i], points[first], points[last]);
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

function toPath(run: Point[]): string {
  return `M${run.map((p) => `${Math.round(p[0])} ${Math.round(p[1])}`).join('L')}`;
}

function main() {
  const raw = JSON.parse(readFileSync(RAW, 'utf8')) as { elements: OsmWay[] };
  const metres = resampleFromLine(stitchLap(raw.elements));
  const lapLength = metres.length;

  const radians = (ROTATION_DEG * Math.PI) / 180;
  const rotated: Point[] = metres.map(([x, y]) => [
    x * Math.cos(radians) - y * Math.sin(radians),
    x * Math.sin(radians) + y * Math.cos(radians),
  ]);
  const xs = rotated.map((p) => p[0]);
  const ys = rotated.map((p) => p[1]);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const scale = (WIDTH - PADDING * 2) / (Math.max(...xs) - minX);
  const height = Math.round((Math.max(...ys) - minY) * scale + PADDING * 2);
  const lap: Point[] = rotated.map(([x, y]) => [
    (x - minX) * scale + PADDING,
    (y - minY) * scale + PADDING,
  ]);

  function at(m: number): Point {
    return lap[
      Math.round(((m % lapLength) + lapLength) % lapLength) % lapLength
    ];
  }
  /** Unit normal to the left of travel, from a tangent smoothed over 20 m. */
  function leftNormal(m: number): Point {
    const [a, b] = [at(m - 10), at(m + 10)];
    const [tx, ty] = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(tx, ty);
    return [ty / len, -tx / len];
  }
  function offset(m: number, side: Side, gap: number): Point {
    const [nx, ny] = leftNormal(m);
    const sign = side === 'left' ? 1 : -1;
    const p = at(m);
    return [p[0] + nx * gap * sign, p[1] + ny * gap * sign];
  }
  function run(from: number, to: number, map: (m: number) => Point = at) {
    const end = to < from ? to + lapLength : to;
    const points: Point[] = [];
    for (let m = from; m <= end; m += 1) {
      points.push(map(m));
    }
    return simplify(points, SIMPLIFY_EPSILON);
  }
  function round([x, y]: Point): XY {
    return { x: Math.round(x), y: Math.round(y) };
  }

  const [s2, s3] = SECTOR_STARTS;
  const sectors = [run(0, s2), run(s2, s3), run(s3, lapLength)].map(toPath);
  const zones = STRAIGHT_MODE_ZONES.map(([from, to]) =>
    toPath(run(from, to, (m) => offset(m, 'left', ZONE_GAP))),
  );
  const corners = TURNS.map((t) => ({
    number: t.number,
    ...round(offset(t.m, t.side, BADGE_GAP)),
  }));
  const [lx, ly] = at(1);
  const [ax, ay] = at(0);
  const startFinish = {
    ...round(at(0)),
    angle: (Math.atan2(ly - ay, lx - ax) * 180) / Math.PI,
  };

  writeFileSync(
    OUT,
    render({
      height,
      sectors,
      zones,
      corners,
      startFinish,
      speedTrap: round(at(SPEED_TRAP_M)),
      detection: round(at(OVERTAKE_DETECTION_M)),
      activation: round(at(OVERTAKE_ACTIVATION_M)),
    }),
  );
  console.log(
    `lap ${lapLength} m, viewBox 0 0 ${WIDTH} ${height}, ${sectors.join('').split('L').length} sector points`,
  );
  console.log(
    'Now run: pnpm exec oxfmt apps/web/src/lib/sepangCircuitGeometry.ts',
  );
}

type XY = { x: number; y: number };

function render(g: {
  height: number;
  sectors: string[];
  zones: string[];
  corners: (XY & { number: number })[];
  startFinish: XY & { angle: number };
  speedTrap: XY;
  detection: XY;
  activation: XY;
}): string {
  function xy(p: XY): string {
    return `{ x: ${p.x}, y: ${p.y} }`;
  }
  return `/**
 * Sepang International Circuit geometry, for the lap map on the 2026 Bahrain
 * Grand Prix write-up.
 *
 * GENERATED by \`scripts/generate-sepang-geometry.mts\`. Do not edit by hand:
 * the outline is © OpenStreetMap contributors (ODbL), and the markers are
 * declared as metres after the line in that script.
 */

export const SEPANG_VIEW_BOX = { width: ${WIDTH}, height: ${g.height} } as const;

/** Sectors 1, 2 and 3, in lap order. Between them they trace the whole lap. */
export const SEPANG_SECTORS: readonly [string, string, string] = [
${g.sectors.map((d) => `  '${d}',`).join('\n')}
];

/** Straight-mode zones, beside the track on the left of travel. */
export const SEPANG_STRAIGHT_MODE_ZONES: readonly string[] = [
${g.zones.map((d) => `  '${d}',`).join('\n')}
];

/** Turn badge centres, outside the lap beside each apex. */
export const SEPANG_CORNERS: readonly { number: number; x: number; y: number }[] = [
${g.corners.map((c) => `  { number: ${c.number}, x: ${c.x}, y: ${c.y} },`).join('\n')}
];

/** The line, and the direction of travel there in degrees clockwise from east. */
export const SEPANG_START_FINISH = {
  x: ${g.startFinish.x},
  y: ${g.startFinish.y},
  angle: ${g.startFinish.angle.toFixed(1)},
} as const;

export const SEPANG_SPEED_TRAP = ${xy(g.speedTrap)} as const;

export const SEPANG_OVERTAKE = {
  detection: ${xy(g.detection)},
  activation: ${xy(g.activation)},
} as const;
`;
}

main();
