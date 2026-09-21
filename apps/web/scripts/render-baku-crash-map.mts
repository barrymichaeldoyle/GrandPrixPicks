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
  countsByDriver,
  driverSurname,
  markerRadius,
  placeMarkers,
  rankedCorners,
  rankedDrivers,
} from '../src/components/race-writeups/bakuCrashMapModel';

/**
 * Combined Baku archive posters. Regenerate with social-baku-crash-map.
 * THESIS: one circuit-history poster, with driver totals inside the map's
 * negative space rather than a second chart. Read mode, F1-literate audience.
 * WORLD: inherit the race-week poster's chartreuse, charcoal and oversized Baku
 * title. Clarity first: no city illustration, interface cards or top logo.
 * STORY: recognize Baku, locate the busiest corners, then read driver totals.
 * COMPOSITION: exact map geometry and archive-derived type on a plain ground;
 * portrait and landscape are separately composed, never cropped from one another.
 * FINISH: visually inspect both exports; record the design and archive scope.
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
const drivers = rankedDrivers(countsByDriver(BAKU_CRASHES));
const maxCorner = Math.max(...counts.values());
const years = [...new Set(BAKU_CRASHES.map((entry) => entry.year))].sort();
const unplaced = BAKU_CRASHES.filter((entry) => entry.corner === null).length;
const period = `${years[0]}–${years.at(-1)}`;
const groups = [
  ...new Set(
    drivers.filter((entry) => entry.count >= 4).map((entry) => entry.count),
  ),
].map((count) => ({
  count,
  names: drivers
    .filter((entry) => entry.count === count)
    .map((entry) => driverSurname(entry.driver)),
}));

function mapSvg(width: number): string {
  const scale = width / BAKU_VIEW_BOX.width;
  const height = Math.round(BAKU_VIEW_BOX.height * scale);
  const base = BAKU_TRACK_SEGMENTS.map(
    (segment) =>
      `<path d="${segment.d}" fill="none" stroke="#616448" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>`,
  ).join('');
  const lit = BAKU_TRACK_SEGMENTS.filter(
    (segment) => (counts.get(segment.corner) ?? 0) > 0,
  )
    .map(
      (segment) =>
        `<path d="${segment.d}" fill="none" stroke="#879b38" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>`,
    )
    .join('');
  /* The same nudging the page does, so the card and the section cannot show
     the castle section differently. */
  const markers = placeMarkers(
    BAKU_CORNERS.map((corner) => ({
      corner: corner.number,
      count: counts.get(corner.number) ?? 0,
      x: corner.x,
      y: corner.y,
      radius: markerRadius(counts.get(corner.number) ?? 0, maxCorner),
    })).filter((marker) => marker.count > 0),
  )
    .slice()
    .sort((a, b) => a.count - b.count)
    .map((marker) => {
      const anchor = BAKU_CORNERS.find(
        (corner) => corner.number === marker.corner,
      );
      const leader =
        anchor !== undefined &&
        Math.hypot(anchor.x - marker.x, anchor.y - marker.y) > 6
          ? `<line x1="${anchor.x}" y1="${anchor.y}" x2="${marker.x.toFixed(
              1,
            )}" y2="${marker.y.toFixed(1)}" stroke="#616448" stroke-width="3"/>`
          : '';
      return `${leader}<circle cx="${marker.x.toFixed(
        1,
      )}" cy="${marker.y.toFixed(1)}" r="${marker.radius.toFixed(
        1,
      )}" fill="${colors.accent}" stroke="${colors.page}" stroke-width="4"/>`;
    })
    .join('');

  /* Start/finish and lap direction, as on the page: without them the drawing
     is an abstract shape rather than a circuit. */
  const sf = `<g transform="translate(${BAKU_START_FINISH.x} ${BAKU_START_FINISH.y}) rotate(${BAKU_START_FINISH.angle})"><line x1="0" y1="-18" x2="0" y2="18" stroke="${colors.text}" stroke-width="6" stroke-linecap="round"/><g transform="translate(36 -32)"><line x1="-18" y1="0" x2="6" y2="0" stroke="${colors.text}" stroke-width="5" stroke-linecap="round"/><path d="M4 -10 L22 0 L4 10 Z" fill="${colors.text}"/></g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BAKU_VIEW_BOX.width} ${BAKU_VIEW_BOX.height}" width="${width}" height="${height}">${base}${lit}${sf}${markers}</svg>`;
}

function box(style: CSSProperties, ...children: ReactNode[]): ReactNode {
  return e('div', { style: { display: 'flex', ...style } }, ...children);
}
function text(
  value: string,
  left: number,
  top: number,
  size: number,
  extra: CSSProperties = {},
): ReactNode {
  return box(
    {
      position: 'absolute',
      left,
      top,
      fontSize: size,
      lineHeight: 1,
      ...extra,
    },
    value,
  );
}
function rule(left: number, top: number, width: number): ReactNode {
  return box({
    position: 'absolute',
    left,
    top,
    width,
    height: 1,
    backgroundColor: '#61635c',
  });
}
function driverKey(
  left: number,
  top: number,
  width: number,
  scale = 1,
): ReactNode {
  let y = 46 * scale;
  return box(
    { position: 'absolute', left, top, width, height: 270 * scale },
    text('Most incidents by driver', 0, 0, 24 * scale, { fontWeight: 600 }),
    ...groups.flatMap((group) => {
      const names =
        group.names.length > 2
          ? [
              group.names.slice(0, 2).join(' · '),
              group.names.slice(2).join(' · '),
            ]
          : [group.names.join(' · ')];
      const row = [
        text(String(group.count), 0, y - 3 * scale, 48 * scale, {
          fontWeight: 900,
          color: colors.accent,
        }),
        ...names.map((line, index) =>
          text(line, 58 * scale, y + index * 30 * scale, 25 * scale),
        ),
      ];
      y += (names.length === 2 ? 78 : 64) * scale;
      return row;
    }),
  );
}
function map(left: number, top: number, width: number): ReactNode {
  const scale = width / BAKU_VIEW_BOX.width;
  const png = new Resvg(mapSvg(width)).render().asPng();
  // Callouts live in the font-aware layout layer. Lines anchor the label to the
  // actual corner, not the collision-adjusted marker or a generated image.
  const positions: Record<
    number,
    { x: number; y: number; endX: number; endY: number }
  > = {
    2: { x: 735, y: -4, endX: 865, endY: 42 },
    3: { x: 288, y: 164, endX: 486, endY: 190 },
    15: { x: 125, y: 503, endX: 112, endY: 535 },
  };
  const leaders = corners
    .slice(0, 3)
    .map(({ corner }) => {
      const anchor = BAKU_CORNERS.find((c) => c.number === corner)!;
      const pos = positions[corner];
      return `<line x1="${anchor.x}" y1="${anchor.y}" x2="${pos.endX}" y2="${pos.endY}" stroke="#a7a8ad" stroke-width="1.5"/>`;
    })
    .join('');
  const leaderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${710 * scale}" viewBox="0 0 1000 710">${leaders}</svg>`;
  return box(
    { position: 'absolute', left, top, width, height: 710 * scale },
    e('img', {
      src: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
      width,
      height: 710 * scale,
    }),
    e('img', {
      src: `data:image/svg+xml;base64,${Buffer.from(leaderSvg).toString('base64')}`,
      width,
      height: 710 * scale,
      style: { position: 'absolute', left: 0, top: 0 },
    }),
    ...corners.slice(0, 3).map(({ corner, count }) => {
      const pos = positions[corner];
      return box(
        {
          position: 'absolute',
          left: pos.x * scale,
          top: pos.y * scale,
          flexDirection: 'column',
        },
        box({ fontSize: 25 * scale, fontWeight: 600 }, `Turn ${corner}`),
        box(
          { fontSize: 23 * scale, marginTop: 4 * scale, color: colors.accent },
          `${count} incidents`,
        ),
      );
    }),
  );
}
function poster(wide: boolean): ReactNode {
  const width = wide ? 1600 : 1080;
  const height = wide ? 900 : 1350;
  const totalLine = `${BAKU_CRASHES.length} incidents · ${years.length} weekends`;
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
    text('Baku', 60, wide ? 20 : 16, wide ? 226 : 300, {
      fontWeight: 900,
      letterSpacing: -9,
      color: colors.accent,
    }),
    text('Crash map', 65, wide ? 257 : 282, wide ? 66 : 73, {
      fontWeight: 600,
      letterSpacing: -2,
    }),
    text(period, wide ? 65 : 770, wide ? 352 : 321, wide ? 29 : 27, {
      color: colors.textMuted,
    }),
    text(totalLine, 65, wide ? 402 : 386, wide ? 27 : 29),
    map(wide ? 604 : 60, wide ? 183 : 454, wide ? 944 : 960),
    driverKey(
      wide ? 65 : 558,
      wide ? 478 : 836,
      wide ? 490 : 450,
      wide ? 1.08 : 1,
    ),
    text(
      'Larger dots = more incidents',
      wide ? 970 : 65,
      wide ? 778 : 438,
      wide ? 22 : 20,
      { color: colors.textMuted },
    ),
    box({
      position: 'absolute',
      left: 0,
      bottom: 0,
      width,
      height: wide ? 76 : 84,
      backgroundColor: colors.page,
    }),
    rule(65, wide ? 824 : 1266, width - 130),
    text('grandprixpicks.com', 65, wide ? 850 : 1296, wide ? 23 : 22),
    text(
      `Curated archive · ${unplaced} incidents unplaced`,
      wide ? 950 : 606,
      wide ? 852 : 1300,
      wide ? 21 : 18,
      { color: colors.textMuted },
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
