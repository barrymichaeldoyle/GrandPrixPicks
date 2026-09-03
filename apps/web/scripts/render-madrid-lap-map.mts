import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';
import { brandMark } from '../src/lib/og/templates';

/**
 * The Madrid lap map, as a post.
 *
 *   pnpm --filter @grandprixpicks/web social-madrid-lap-map
 *
 * The third lane of the social pipeline. `render-social-card.mts` draws a card
 * out of tokens and the Monza roundup composes copy over collage art; this one
 * has a single subject that already exists as artwork, so the job is framing
 * rather than illustration. The art is the write-up's map, exported to PNG
 * next to this campaign: satori has no WebP decoder, so it cannot read the
 * `.webp` the site actually serves. Both come out of the same recolour, so a
 * change to the map means re-exporting this one alongside it.
 *
 * The two frames treat it differently on purpose. Instagram crops anything
 * taller than 4:5 and the map is 16:9, so it sits as a band with the headline
 * above it and the numbers below. X shows a 16:9 image nearly at the card's
 * own size, so there the map is the whole frame and the type goes in the empty
 * ground inside the lap, which is the one place a label cannot sit on a corner.
 */

const INSTAGRAM_WIDTH = 1080;
const INSTAGRAM_HEIGHT = 1350;
const X_WIDTH = 1600;
const X_HEIGHT = 900;
const MAP_RATIO = 1600 / 893;

const SLUG = 'madrid-lap-map-2026';
const artifactOutputDir = fileURLToPath(
  new URL(`../../../artifacts/social/${SLUG}/`, import.meta.url),
);
const publicOutputDir = fileURLToPath(
  new URL(`../public/social/${SLUG}/`, import.meta.url),
);

const map = `data:image/png;base64,${readFileSync(
  path.join(artifactOutputDir, 'source-art', 'madrid-lap-map.png'),
).toString('base64')}`;

const FACTS = [
  ['Length', '5.416 km'],
  ['Corners', '22'],
  ['Race', '57 laps'],
] as const;

/**
 * The logo lockup: the mark from `templates.ts` and the wordmark beside it.
 *
 * The mark is the app's own SVG rather than three skewed divs that look like
 * it, which is the drift `brandMark` exists to prevent. A post that carries a
 * near-miss of the logo is worse than one that carries none.
 */
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

function footer(
  gutter: number,
  bottom: number,
  align: 'flex-start' | 'flex-end',
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: align,
        position: 'absolute',
        left: gutter,
        right: gutter,
        bottom,
        fontFamily: 'IBM Plex Mono',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: 2.4,
        color: colors.accent,
      },
    },
    'GRANDPRIXPICKS.COM',
  );
}

function instagram(): ReactNode {
  const mapHeight = Math.round(INSTAGRAM_WIDTH / MAP_RATIO);
  return canvas(INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT, [
    logo(64, 54),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 64,
          top: 168,
          width: 900,
        },
      },
      eyebrow('MADRING  /  ROUND 14  /  11–13 SEPTEMBER'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 30,
            fontSize: 92,
            fontWeight: 600,
            letterSpacing: -4.6,
            lineHeight: 0.94,
          },
        },
        e('div', { style: { display: 'flex' } }, 'Nobody has'),
        e('div', { style: { display: 'flex' } }, 'raced here.'),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 830,
            marginTop: 30,
            fontSize: 29,
            lineHeight: 1.35,
            color: colors.textMuted,
          },
        },
        'Turn 12 is the longest banked corner on the calendar: 550 m at 24 percent.',
      ),
    ),
    // Full bleed. The map carries its own surface, so an inset would put a
    // second panel edge inside a frame that already has one.
    e('img', {
      src: map,
      width: INSTAGRAM_WIDTH,
      height: mapHeight,
      style: {
        position: 'absolute',
        left: 0,
        top: 536,
        width: INSTAGRAM_WIDTH,
        height: mapHeight,
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          position: 'absolute',
          left: 64,
          right: 64,
          top: 1176,
        },
      },
      ...FACTS.map(([label, value]) =>
        e(
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
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: 2.4,
                color: colors.textMuted,
              },
            },
            label.toUpperCase(),
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                marginTop: 10,
                fontSize: 44,
                fontWeight: 600,
              },
            },
            value,
          ),
        ),
      ),
    ),
    footer(64, 46, 'flex-start'),
  ]);
}

function xCard(): ReactNode {
  // Cover rather than contain: the map is 1600x893 and the frame is 1600x900,
  // so seven pixels of page would otherwise show along one edge.
  const width = Math.round(X_HEIGHT * MAP_RATIO);
  return canvas(X_WIDTH, X_HEIGHT, [
    e('img', {
      src: map,
      width,
      height: X_HEIGHT,
      style: {
        position: 'absolute',
        left: Math.round((X_WIDTH - width) / 2),
        top: 0,
        width,
        height: X_HEIGHT,
      },
    }),
    logo(64, 46),
    // The lap encloses a big empty middle, but type dropped in there sits
    // between the corners and reads as part of the diagram. The ground the lap
    // does not reach is the bottom right, so the type goes there and the
    // picture stays a picture. It is also where the eye lands last.
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          // Right-aligned to the frame's own gutter: the block's straight edge
          // then lines up with the margin the logo sits on, and the ragged one
          // faces the empty middle instead of the edge of the card.
          alignItems: 'flex-end',
          textAlign: 'right',
          position: 'absolute',
          right: 64,
          top: 486,
          width: 560,
        },
      },
      eyebrow('MADRING  /  11–13 SEPTEMBER'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 26,
            fontSize: 74,
            fontWeight: 600,
            letterSpacing: -3.6,
            lineHeight: 0.94,
          },
        },
        e('div', { style: { display: 'flex' } }, 'Nobody has'),
        e('div', { style: { display: 'flex' } }, 'raced here.'),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 520,
            marginTop: 24,
            fontSize: 26,
            lineHeight: 1.35,
            color: colors.textMuted,
          },
        },
        '5.416 km, 22 corners, 57 laps.',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 30,
            fontFamily: 'IBM Plex Mono',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 2.4,
            color: colors.accent,
          },
        },
        'GRANDPRIXPICKS.COM',
      ),
    ),
  ]);
}

async function render(
  filename: string,
  node: ReactNode,
  width: number,
  height: number,
) {
  const fonts = await loadFonts();
  const svg = await satori(node, { width, height, fonts });
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

await render(
  `${SLUG}-instagram.png`,
  instagram(),
  INSTAGRAM_WIDTH,
  INSTAGRAM_HEIGHT,
);
await render(`${SLUG}-x.png`, xCard(), X_WIDTH, X_HEIGHT);

console.log(`Wrote ${SLUG} artwork to ${artifactOutputDir}`);
