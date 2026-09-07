import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import {
  BAKU_CORNERS,
  BAKU_TRACK_SEGMENTS,
  BAKU_VIEW_BOX,
} from '../src/lib/bakuCircuitGeometry';
import { BAKU_CRASHES } from '../src/lib/bakuCrashes';
import {
  countsByCorner,
  countsByDriver,
  driverSurname,
  heatStep,
  markerRadius,
  rankedCorners,
  rankedDrivers,
} from '../src/components/race-writeups/bakuCrashMapModel';
import { loadFonts } from '../src/lib/og/fonts';
import { brandMark } from '../src/lib/og/templates';

/**
 * The Baku crash archive, as posts.
 *
 *   pnpm --filter @grandprixpicks/web social-baku-crash-map
 *
 * Two subjects, because the archive has two findings and one card cannot carry
 * both: where the walls are (turns 3 and 15), and who they have caught (nobody
 * more than Hulkenberg and Stroll).
 *
 * **The map is drawn here, not imported.** The Madrid lap map embeds a PNG
 * exported by hand from the write-up, which means a change to the map is a
 * change in two places and the post can quietly go stale. This one builds the
 * same SVG from `bakuCircuitGeometry` and `bakuCrashes` and rasterises it on
 * the way past, so the card is a rendering of the data rather than a picture of
 * an older version of it. Satori cannot lay out arbitrary SVG, hence the
 * intermediate raster rather than an inline element.
 *
 * Raw counts, never percentages: with nine weekends the real numbers are more
 * credible than a share that implies a bigger sample. That is the same rule the
 * community picks cards follow.
 *
 * Nothing here reads as advice about who to pick. The cars and the regulations
 * have changed underneath these numbers and drivers learn from a wall; the
 * cards are circuit history, and the copy in `campaign.md` has to stay that
 * way too.
 */

const INSTAGRAM_WIDTH = 1080;
const INSTAGRAM_HEIGHT = 1350;
const X_WIDTH = 1600;
const X_HEIGHT = 900;

const SLUG = 'baku-crash-map-2026';
const artifactOutputDir = fileURLToPath(
  new URL(`../../../artifacts/social/${SLUG}/`, import.meta.url),
);
const publicOutputDir = fileURLToPath(
  new URL(`../public/social/${SLUG}/`, import.meta.url),
);

const counts = countsByCorner(BAKU_CRASHES);
const corners = rankedCorners(counts);
const drivers = rankedDrivers(countsByDriver(BAKU_CRASHES));
const maxCorner = Math.max(...counts.values());
const maxDriver = drivers[0].count;

const HEAT = [
  colors.crashHeat1,
  colors.crashHeat2,
  colors.crashHeat3,
  colors.crashHeat4,
  colors.crashHeat5,
] as const;

function heat(count: number, max: number): string {
  return HEAT[heatStep(count, max) - 1] ?? colors.border;
}

/**
 * The lap, shaded and marked, as standalone SVG.
 *
 * A larger stroke and marker ring than the page uses: this is read at a
 * thumbnail's size in a feed rather than at a section's size on a page, and the
 * weights that are right at 700px on a screen disappear at 300px in a timeline.
 */
function mapSvg(width: number): string {
  const scale = width / BAKU_VIEW_BOX.width;
  const height = Math.round(BAKU_VIEW_BOX.height * scale);
  const base = BAKU_TRACK_SEGMENTS.map(
    (segment) =>
      `<path d="${segment.d}" fill="none" stroke="${colors.borderStrong}" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>`,
  ).join('');
  const lit = BAKU_TRACK_SEGMENTS.filter(
    (segment) => (counts.get(segment.corner) ?? 0) > 0,
  )
    .map(
      (segment) =>
        `<path d="${segment.d}" fill="none" stroke="${heat(
          counts.get(segment.corner) ?? 0,
          maxCorner,
        )}" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>`,
    )
    .join('');
  const markers = [...BAKU_CORNERS]
    .filter((corner) => (counts.get(corner.number) ?? 0) > 0)
    .sort((a, b) => (counts.get(a.number) ?? 0) - (counts.get(b.number) ?? 0))
    .map((corner) => {
      const count = counts.get(corner.number) ?? 0;
      const radius = markerRadius(count, maxCorner);
      const fill = heat(count, maxCorner);
      return `<circle cx="${corner.x}" cy="${corner.y}" r="${radius.toFixed(
        1,
      )}" fill="${fill}" stroke="${colors.page}" stroke-width="4"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BAKU_VIEW_BOX.width} ${BAKU_VIEW_BOX.height}" width="${width}" height="${height}">${base}${lit}${markers}</svg>`;
}

/**
 * Rasterise the lap, with fonts.
 *
 * resvg has no font of its own and silently drops every `<text>` without one,
 * which is how the first render of this card came out with unlabelled markers:
 * a map whose whole point is naming the corner. The buffers are the same
 * Archivo satori is laying the card out with.
 */
function mapDataUri(
  width: number,
  fontBuffers: Uint8Array[],
): { uri: string; height: number } {
  const png = new Resvg(mapSvg(width), {
    fitTo: { mode: 'width', value: width },
    font: {
      fontBuffers,
      defaultFontFamily: 'Archivo',
      loadSystemFonts: false,
    },
  })
    .render()
    .asPng();
  return {
    uri: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
    height: Math.round((BAKU_VIEW_BOX.height / BAKU_VIEW_BOX.width) * width),
    width,
  };
}

function logo(gutter: number, top: number): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'absolute',
        left: gutter,
        top,
      },
    },
    brandMark(38),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 3.4,
          color: colors.text,
        },
      },
      'GRAND PRIX PICKS',
    ),
  );
}

function canvas(
  width: number,
  height: number,
  children: ReactNode[],
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: 'Archivo',
      },
    },
    ...children,
  );
}

function eyebrow(text: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: 3,
        color: colors.accent,
      },
    },
    text,
  );
}

function headline(text: string, size: number): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        marginTop: 14,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.05,
        letterSpacing: -1,
        color: colors.text,
      },
    },
    text,
  );
}

function domain(size = 16): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize: size,
        fontWeight: 600,
        letterSpacing: 2.4,
        color: colors.accent,
      },
    },
    'GRANDPRIXPICKS.COM',
  );
}

/**
 * One row of the ranked list: a label, a bar and the count.
 *
 * The bar is the same sequential ramp the page uses, so a reader who has seen
 * the section recognises the scale rather than learning a new one.
 */
type BarSpec = {
  /** Longest bar, in pixels. */
  barWidth: number;
  /** Fixed column for the name, so every bar starts on the same line. */
  labelWidth: number;
  fontSize: number;
  barHeight: number;
  /** Space under each row. Set per frame so the list fills its canvas. */
  gap: number;
};

function barRow(
  label: string,
  count: number,
  max: number,
  spec: BarSpec,
): ReactNode {
  return e(
    'div',
    {
      key: label,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        marginBottom: spec.gap,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          width: spec.labelWidth,
          fontSize: spec.fontSize,
          fontWeight: 500,
          color: colors.text,
        },
      },
      label,
    ),
    e('div', {
      style: {
        display: 'flex',
        width: Math.round((count / max) * spec.barWidth),
        height: spec.barHeight,
        borderRadius: 2,
        backgroundColor: heat(count, max),
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: spec.fontSize,
          fontWeight: 600,
          color: colors.textMuted,
        },
      },
      String(count),
    ),
  );
}

type MapArt = { uri: string; height: number; width: number };

/** How many corners get a callout on the artwork. */
const LABELLED_CORNERS = 3;

/**
 * The map with its busiest corners called out.
 *
 * The labels are drawn by satori rather than inside the SVG, because resvg has
 * no font of its own and cannot parse the WOFF that satori is using, so every
 * `<text>` in the rasterised lap silently disappeared. Drawing them in the
 * layout layer fixes that and reads better anyway: a numeral inside a small
 * circle is illegible at the size a card is actually seen, where a chip naming
 * the corner and its count is not.
 *
 * Each chip is offset from its marker toward the middle of the map, which is
 * the one direction that cannot run off an edge.
 */
function mapWithLabels(art: MapArt): ReactNode {
  const scale = art.width / BAKU_VIEW_BOX.width;
  const centre = { x: BAKU_VIEW_BOX.width / 2, y: BAKU_VIEW_BOX.height / 2 };
  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width: art.width,
        height: art.height,
      },
    },
    e('img', { src: art.uri, width: art.width, height: art.height }),
    ...corners.slice(0, LABELLED_CORNERS).map((entry) => {
      const corner = BAKU_CORNERS.find((c) => c.number === entry.corner);
      if (corner === undefined) {
        return null;
      }
      const dx = centre.x - corner.x;
      const dy = centre.y - corner.y;
      const length = Math.hypot(dx, dy) || 1;
      const offset = 92;
      const text = `T${entry.corner} · ${entry.count}`;
      // Satori has no text metrics here, so the chip is centred on its anchor
      // using an estimate: mono glyphs at this size run about half the em.
      const chipWidth = text.length * 12 + 24;
      return e(
        'div',
        {
          key: entry.corner,
          style: {
            display: 'flex',
            position: 'absolute',
            left: Math.round(
              (corner.x + (dx / length) * offset) * scale - chipWidth / 2,
            ),
            top: Math.round((corner.y + (dy / length) * offset) * scale - 19),
            width: chipWidth,
            height: 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            backgroundColor: colors.page,
            border: `1px solid ${colors.borderStrong}`,
            fontFamily: 'IBM Plex Mono',
            fontSize: 21,
            fontWeight: 600,
            color: colors.text,
          },
        },
        text,
      );
    }),
  );
}

/** Instagram crops anything taller than 4:5, so the map sits as a band. */
function cornerInstagram(art: MapArt): ReactNode {
  const gutter = 72;
  return canvas(INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT, [
    logo(gutter, 64),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: gutter,
          right: gutter,
          /* Centred rather than hung from the logo: the map is 4:3 inside a
             4:5 frame, so top-aligning it left a quarter of the card empty. */
          top: 230,
        },
      },
      eyebrow('BAKU CITY CIRCUIT'),
      headline('Where the walls take cars', 66),
      e(
        'div',
        { style: { display: 'flex', marginTop: 28 } },
        mapWithLabels(art),
      ),
      e(
        'div',
        { style: { display: 'flex', gap: 56, marginTop: 24 } },
        ...HEADLINE_STATS.map(([value, label]) => statBlock(label, value)),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: gutter,
          bottom: 64,
        },
      },
      domain(),
    ),
  ]);
}

function statBlock(label: string, value: string): ReactNode {
  return e(
    'div',
    {
      key: label,
      style: { display: 'flex', flexDirection: 'column' },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: 52,
          fontWeight: 600,
          color: colors.text,
        },
      },
      value,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 4,
          fontFamily: 'IBM Plex Mono',
          fontSize: 17,
          letterSpacing: 2,
          color: colors.textMuted,
        },
      },
      label.toUpperCase(),
    ),
  );
}

/** X shows 16:9 nearly full size, so the map takes the right half. */
function cornerX(art: MapArt): ReactNode {
  const gutter = 72;
  return canvas(X_WIDTH, X_HEIGHT, [
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          right: 24,
          top: Math.round((X_HEIGHT - art.height) / 2),
        },
      },
      mapWithLabels(art),
    ),
    logo(gutter, 64),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: gutter,
          top: 210,
          width: 620,
        },
      },
      eyebrow('BAKU, 2016 TO 2025'),
      headline('Where the walls take cars', 62),
      e(
        'div',
        { style: { display: 'flex', gap: 48, marginTop: 40 } },
        ...HEADLINE_STATS.map(([value, label]) => statBlock(label, value)),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: gutter,
          bottom: 64,
        },
      },
      domain(),
    ),
  ]);
}

/**
 * The figures beside the map, which must not be the ones already on it.
 *
 * The callouts name the three busiest corners and their counts, so repeating
 * those here spent the row saying nothing. These are the facts the picture
 * cannot show: how much of the lap is implicated, and over how long.
 */
const HEADLINE_STATS: readonly (readonly [string, string])[] = [
  [String(BAKU_CRASHES.length), 'Incidents'],
  ['9', 'Weekends'],
  [String(corners.length), 'Corners hit'],
];

const DRIVER_ROWS = 8;

function driverInstagram(): ReactNode {
  const gutter = 72;
  return canvas(INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT, [
    logo(gutter, 64),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: gutter,
          right: gutter,
          top: 150,
        },
      },
      eyebrow('BAKU, 2016 TO 2025'),
      headline('Caught out most in Baku', 66),
      e(
        'div',
        { style: { display: 'flex', flexDirection: 'column', marginTop: 44 } },
        ...drivers.slice(0, DRIVER_ROWS).map((entry) =>
          barRow(driverSurname(entry.driver), entry.count, maxDriver, {
            barWidth: 500,
            labelWidth: 300,
            fontSize: 36,
            barHeight: 18,
            gap: 58,
          }),
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 18,
            fontSize: 22,
            color: colors.textMuted,
          },
        },
        `${BAKU_CRASHES.length} incidents across nine weekends`,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: gutter,
          bottom: 64,
        },
      },
      domain(),
    ),
  ]);
}

function driverX(): ReactNode {
  const gutter = 72;
  return canvas(X_WIDTH, X_HEIGHT, [
    logo(gutter, 64),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: gutter,
          top: 190,
          width: 560,
        },
      },
      eyebrow('BAKU, 2016 TO 2025'),
      headline('Caught out most in Baku', 60),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 26,
            fontSize: 22,
            lineHeight: 1.4,
            color: colors.textMuted,
          },
        },
        `${BAKU_CRASHES.length} incidents that ended in a red flag, a retirement or a stewards' collision note.`,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          right: gutter,
          top: 150,
          width: 780,
        },
      },
      ...drivers.slice(0, DRIVER_ROWS).map((entry) =>
        barRow(driverSurname(entry.driver), entry.count, maxDriver, {
          barWidth: 420,
          labelWidth: 270,
          fontSize: 30,
          barHeight: 16,
          gap: 40,
        }),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: gutter,
          bottom: 64,
        },
      },
      domain(),
    ),
  ]);
}

async function render(
  filename: string,
  node: ReactNode,
  width: number,
  height: number,
) {
  const svg = await satori(node, { width, height, fonts: await loadFonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();
  await writeFile(path.join(artifactOutputDir, filename), png);
  await writeFile(path.join(publicOutputDir, filename), png);
}

await mkdir(artifactOutputDir, { recursive: true });
await mkdir(publicOutputDir, { recursive: true });
const require = createRequire(import.meta.url);
await initWasm(
  await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
);

const fontBuffers = (await loadFonts()).map(
  (font) => new Uint8Array(font.data),
);
const instagramMapWidth = INSTAGRAM_WIDTH - 72 * 2;

await render(
  `${SLUG}-corners-instagram.png`,
  cornerInstagram(mapDataUri(instagramMapWidth, fontBuffers)),
  INSTAGRAM_WIDTH,
  INSTAGRAM_HEIGHT,
);
await render(
  `${SLUG}-corners-x.png`,
  cornerX(mapDataUri(880, fontBuffers)),
  X_WIDTH,
  X_HEIGHT,
);
await render(
  `${SLUG}-drivers-instagram.png`,
  driverInstagram(),
  INSTAGRAM_WIDTH,
  INSTAGRAM_HEIGHT,
);
await render(`${SLUG}-drivers-x.png`, driverX(), X_WIDTH, X_HEIGHT);

console.log(`Wrote ${SLUG} artwork to ${artifactOutputDir}`);
