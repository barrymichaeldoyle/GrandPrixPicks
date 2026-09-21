import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { createElement as e, type CSSProperties, type ReactNode } from 'react';
import satori from 'satori';
import {
  BAKU_CORNERS,
  BAKU_START_FINISH,
  BAKU_TRACK_SEGMENTS,
  BAKU_VIEW_BOX,
} from '../src/lib/bakuCircuitGeometry';
import { BAKU_CRASHES } from '../src/lib/bakuCrashes';
import {
  countsByCorner,
  markerRadius,
  placeMarkers,
  rankedCorners,
} from '../src/components/race-writeups/bakuCrashMapModel';

/**
 * Baku crash map posters. Regenerate with social-baku-crash-map.
 *
 * A poster, not an infographic: the race name, one line of fact, the lap, and
 * the two corners that stand out, as numbers big enough to read in a feed.
 * The first revision carried a legend, a driver key, a date line and an
 * archive qualification as well, and read as a page of small type. Those
 * facts are still true and still published: the driver totals and the
 * archive's scope live in the captions (`campaign.md`), and the full archive
 * is on the write-up this post links to.
 *
 * Geometry is the page's own (`bakuCircuitGeometry.ts`) and the dots use the
 * page's marker placement, so the card and the section cannot disagree.
 */
const SLUG = 'baku-crash-map-2026';
const artifactOutputDir = fileURLToPath(
  new URL(`../../../artifacts/social/${SLUG}/`, import.meta.url),
);
const publicOutputDir = fileURLToPath(
  new URL(`../public/social/${SLUG}/`, import.meta.url),
);
const fontDir = fileURLToPath(new URL('../public/fonts/', import.meta.url));
const counts = countsByCorner(BAKU_CRASHES);
const corners = rankedCorners(counts);
const maxCorner = Math.max(...counts.values());
const firstYear = Math.min(...BAKU_CRASHES.map((entry) => entry.year));
const TRACK = '#4a4c3c';

const markers = placeMarkers(
  BAKU_CORNERS.map((corner) => ({
    corner: corner.number,
    count: counts.get(corner.number) ?? 0,
    x: corner.x,
    y: corner.y,
    radius: markerRadius(counts.get(corner.number) ?? 0, maxCorner),
  })).filter((marker) => marker.count > 0),
);

/** The two corners the poster names: the archive's top two by count. */
const featured = corners.slice(0, 2).map(({ corner, count }) => ({
  corner,
  count,
  marker: markers.find((marker) => marker.corner === corner)!,
}));

function mapSvg(width: number): string {
  const height = Math.round(
    (BAKU_VIEW_BOX.height * width) / BAKU_VIEW_BOX.width,
  );
  const track = BAKU_TRACK_SEGMENTS.map(
    (segment) =>
      `<path d="${segment.d}" fill="none" stroke="${TRACK}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>`,
  ).join('');
  const dots = markers
    .slice()
    .sort((a, b) => a.count - b.count)
    .map(
      (marker) =>
        `<circle cx="${marker.x.toFixed(1)}" cy="${marker.y.toFixed(1)}" r="${(marker.radius * 1.15).toFixed(1)}" fill="${colors.accent}" stroke="${colors.page}" stroke-width="5"/>`,
    )
    .join('');
  /* Start/finish and lap direction: without them the drawing is an abstract
     shape rather than a circuit. */
  const sf = `<g transform="translate(${BAKU_START_FINISH.x} ${BAKU_START_FINISH.y}) rotate(${BAKU_START_FINISH.angle})"><line x1="0" y1="-18" x2="0" y2="18" stroke="${colors.text}" stroke-width="6" stroke-linecap="round"/><g transform="translate(36 -32)"><line x1="-18" y1="0" x2="6" y2="0" stroke="${colors.text}" stroke-width="5" stroke-linecap="round"/><path d="M4 -10 L22 0 L4 10 Z" fill="${colors.text}"/></g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BAKU_VIEW_BOX.width} ${BAKU_VIEW_BOX.height}" width="${width}" height="${height}">${track}${sf}${dots}</svg>`;
}

function box(style: CSSProperties, ...children: ReactNode[]): ReactNode {
  return e('div', { style: { display: 'flex', ...style } }, ...children);
}

type Side = 'left' | 'right';
/**
 * Where a corner's number sits: beside its dot on one side, or under it,
 * left-aligned with the dot, when neither side has open space.
 */
type Placement = { side: Side } | { below: true; drop: number };

/**
 * A corner's count as a poster numeral, set beside its dot. `side` says which
 * side of the dot the number sits on, chosen per format so it lands in open
 * space rather than across the track.
 */
function callout(
  corner: number,
  count: number,
  x: number,
  y: number,
  radius: number,
  placement: Placement,
  size: number,
): ReactNode {
  const gap = radius + size * 0.18;
  const blockWidth = size * 1.4;
  const position: CSSProperties =
    'below' in placement
      ? { left: x - radius, top: y + radius + placement.drop }
      : {
          left: placement.side === 'left' ? x - gap - blockWidth : x + gap,
          top: y - size * 0.62,
        };
  const alignRight = !('below' in placement) && placement.side === 'left';
  return box(
    {
      position: 'absolute',
      ...position,
      width: blockWidth,
      flexDirection: 'column',
      alignItems: alignRight ? 'flex-end' : 'flex-start',
    },
    box(
      {
        fontSize: size * 0.22,
        fontWeight: 600,
        color: colors.textMuted,
        lineHeight: 1,
      },
      `Turn ${corner}`,
    ),
    box(
      {
        fontSize: size,
        fontWeight: 900,
        letterSpacing: -size * 0.04,
        lineHeight: 0.9,
        color: colors.text,
      },
      String(count),
    ),
  );
}

function map(
  left: number,
  top: number,
  width: number,
  placements: Record<number, Placement>,
  numeral: number,
): ReactNode {
  const scale = width / BAKU_VIEW_BOX.width;
  const height = BAKU_VIEW_BOX.height * scale;
  const png = new Resvg(mapSvg(width)).render().asPng();
  return box(
    { position: 'absolute', left, top, width, height },
    e('img', {
      src: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
      width,
      height,
    }),
    ...featured.map(({ corner, count, marker }) =>
      callout(
        corner,
        count,
        marker.x * scale,
        marker.y * scale,
        marker.radius * 1.15 * scale,
        placements[corner] ?? { side: 'left' },
        numeral,
      ),
    ),
  );
}

function poster(wide: boolean): ReactNode {
  const width = wide ? 1600 : 1080;
  const height = wide ? 900 : 1350;
  const fact = `${BAKU_CRASHES.length} incidents since ${firstYear}`;
  return box(
    {
      position: 'relative',
      width,
      height,
      overflow: 'hidden',
      backgroundColor: colors.page,
      color: colors.text,
      fontFamily: 'Archivo',
    },
    box(
      {
        position: 'absolute',
        left: wide ? 58 : 52,
        top: wide ? 34 : 24,
        fontSize: wide ? 250 : 320,
        fontWeight: 900,
        letterSpacing: wide ? -10 : -12,
        lineHeight: 1,
        color: colors.accent,
      },
      'Baku',
    ),
    box(
      {
        position: 'absolute',
        left: wide ? 66 : 64,
        top: wide ? 300 : 352,
        fontSize: wide ? 50 : 54,
        fontWeight: 600,
        letterSpacing: -1.5,
        lineHeight: 1,
      },
      fact,
    ),
    wide
      ? map(600, 160, 960, { 3: { side: 'left' }, 15: { side: 'left' } }, 150)
      : /* Turn 15 sits at the left edge in portrait, with track on both
           sides of it, so its number goes underneath. */
        map(
          30,
          420,
          1020,
          { 3: { side: 'left' }, 15: { below: true, drop: 62 } },
          150,
        ),
    /* Bottom right: X's ALT badge covers the lower left, and in portrait
       the Turn 15 number holds that corner. */
    box(
      {
        position: 'absolute',
        right: 64,
        bottom: wide ? 40 : 48,
        fontSize: wide ? 26 : 28,
        color: colors.textMuted,
      },
      'grandprixpicks.com',
    ),
  );
}

await mkdir(artifactOutputDir, { recursive: true });
await mkdir(publicOutputDir, { recursive: true });
const require = createRequire(import.meta.url);
await initWasm(
  await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
);
const fonts = await Promise.all(
  ([400, 600, 900] as const).map(async (weight) => ({
    name: 'Archivo',
    data: await readFile(path.join(fontDir, `archivo-${weight}-latin.ttf`)),
    weight,
    style: 'normal' as const,
  })),
);
for (const wide of [false, true]) {
  const width = wide ? 1600 : 1080;
  const height = wide ? 900 : 1350;
  const filename = `${SLUG}-${wide ? 'x' : 'instagram'}.png`;
  const svg = await satori(poster(wide), { width, height, fonts });
  const png = new Resvg(svg).render().asPng();
  await writeFile(path.join(artifactOutputDir, filename), png);
  await writeFile(path.join(publicOutputDir, filename), png);
  console.log(`Wrote ${filename} (${width}×${height})`);
}
