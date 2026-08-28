import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors, teams } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';

const INSTAGRAM_WIDTH = 1080;
const INSTAGRAM_HEIGHT = 1350;
const X_WIDTH = 1600;
const X_HEIGHT = 900;

const campaignDir = fileURLToPath(
  new URL(
    '../../../artifacts/social/monza-news-roundup-2026/',
    import.meta.url,
  ),
);
const artifactOutputDir = path.join(campaignDir, 'images');
const publicOutputDir = fileURLToPath(
  new URL('../public/social/monza-news-roundup-2026/', import.meta.url),
);

function artSource(filename: string): string {
  return `data:image/png;base64,${readFileSync(
    path.join(campaignDir, 'source-art', filename),
  ).toString('base64')}`;
}

const art = {
  cover: artSource('cover-art.png'),
  ferrariTribute: artSource('ferrari-tribute-art.png'),
  ferrariUpgrades: artSource('ferrari-upgrades-art.png'),
  antonelli: artSource('antonelli-grid-art.png'),
  browning: artSource('browning-fp1-art.png'),
  hadjar: artSource('hadjar-status-art.png'),
  x: artSource('x-summary-art.png'),
};

type Story = {
  filename: string;
  art: string;
  eyebrow: string;
  title: string;
  body: string;
  source: string;
  color: string;
  titleSize?: number;
};

const stories: Story[] = [
  {
    filename: 'ferrari-tribute.png',
    art: art.ferrariTribute,
    eyebrow: 'REPORTED  /  FERRARI',
    title: 'Ferrari set for Schumacher tribute livery.',
    body: "The expected design draws on 1996. Hamilton and Leclerc's seven-star race suits have already been revealed.",
    source: 'Reported by Motorsport.com',
    color: teams.Ferrari,
    titleSize: 67,
  },
  {
    filename: 'ferrari-upgrades.png',
    art: art.ferrariUpgrades,
    eyebrow: 'REPORTED  /  FERRARI',
    title: 'Ferrari set to bring engine and aero upgrades.',
    body: "An upgraded power unit, aerodynamic changes and Monza-specific parts are reportedly in the team's home-race package.",
    source: 'Reported by Autosport',
    color: teams.Ferrari,
    titleSize: 65,
  },
  {
    filename: 'antonelli-grid-penalty.png',
    art: art.antonelli,
    eyebrow: 'CONFIRMED  /  MERCEDES',
    title: 'Kimi Antonelli will take at least a 10-place grid penalty.',
    body: 'Mercedes plans to change his power unit ahead of his home race. Antonelli arrives at Monza leading the championship.',
    source: 'Confirmed by Formula 1',
    color: teams.Mercedes,
    titleSize: 62,
  },
  {
    filename: 'browning-fp1.png',
    art: art.browning,
    eyebrow: 'CONFIRMED  /  WILLIAMS',
    title: 'Luke Browning replaces Alex Albon in FP1.',
    body: "Browning will drive Albon's Williams in Friday's opening session. Albon returns to the car for FP2.",
    source: 'Confirmed by Williams',
    color: teams.Williams,
    titleSize: 67,
  },
  {
    filename: 'hadjar-status.png',
    art: art.hadjar,
    eyebrow: 'DRIVER UPDATE',
    title: "Isack Hadjar's Monza return remains unconfirmed.",
    body: 'He missed Zandvoort with a wrist injury. His fitness will determine the Red Bull and Racing Bulls line-ups at Monza.',
    source: 'Status as of 28 August',
    color: teams['Red Bull Racing'],
    titleSize: 65,
  },
];

function mark(scale = 1): ReactNode {
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'flex-end', gap: 7 * scale } },
    ...[39, 60, 32].map((height, index) =>
      e('div', {
        key: String(index),
        style: {
          width: 20 * scale,
          height: height * scale,
          backgroundColor: colors.accent,
          transform: 'skew(-12deg)',
        },
      }),
    ),
  );
}

function background(src: string, width: number, height: number): ReactNode {
  return e('img', {
    src,
    width,
    height,
    style: {
      position: 'absolute',
      inset: 0,
      width,
      height,
      objectFit: 'cover',
    },
  });
}

function brandRail(width: number, compact = false): ReactNode {
  const gutter = compact ? 70 : 72;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'absolute',
        left: gutter,
        right: gutter,
        top: compact ? 42 : 58,
        width: width - gutter * 2,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: compact ? 15 : 17,
          fontWeight: 600,
          letterSpacing: compact ? 2.4 : 3,
          color: colors.text,
        },
      },
      'GRAND PRIX PICKS  /  MONZA',
    ),
    mark(compact ? 0.46 : 0.54),
  );
}

function italianStripe(width = 220): ReactNode {
  const segment = width / 3;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        width,
        height: 11,
        transform: 'skew(-12deg)',
      },
    },
    e('div', {
      style: { display: 'flex', width: segment, backgroundColor: '#168b4c' },
    }),
    e('div', {
      style: { display: 'flex', width: segment, backgroundColor: '#eee8db' },
    }),
    e('div', {
      style: {
        display: 'flex',
        width: segment,
        backgroundColor: teams.Ferrari,
      },
    }),
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

function cover(): ReactNode {
  return canvas(INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT, [
    background(art.cover, INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT),
    e('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 850,
        backgroundImage:
          'linear-gradient(90deg, rgba(8, 9, 11, 0.94) 0%, rgba(8, 9, 11, 0.82) 68%, rgba(8, 9, 11, 0) 100%)',
      },
    }),
    brandRail(INSTAGRAM_WIDTH),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 72,
          top: 255,
          width: 700,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 3,
            color: '#d5cec0',
          },
        },
        'ONE WEEK TO GO',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 32,
            fontSize: 103,
            fontWeight: 600,
            letterSpacing: -5.5,
            lineHeight: 0.91,
          },
        },
        e('div', { style: { display: 'flex' } }, 'The latest'),
        e('div', { style: { display: 'flex' } }, 'Monza news.'),
      ),
      e('div', { style: { display: 'flex', marginTop: 50 } }, italianStripe()),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 28,
            fontSize: 27,
            color: '#d5cec0',
          },
        },
        '4–6 September 2026',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 72,
          bottom: 58,
          color: '#d5cec0',
          fontFamily: 'IBM Plex Mono',
          fontSize: 14,
          letterSpacing: 2,
        },
      },
      'WHAT WE KNOW AHEAD OF THE ITALIAN GRAND PRIX',
    ),
  ]);
}

function storyCard(story: Story): ReactNode {
  return canvas(INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT, [
    background(story.art, INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT),
    e('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 840,
        backgroundImage:
          'linear-gradient(90deg, rgba(7, 8, 10, 0.95) 0%, rgba(7, 8, 10, 0.84) 72%, rgba(7, 8, 10, 0) 100%)',
      },
    }),
    brandRail(INSTAGRAM_WIDTH),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 72,
          top: 230,
          width: 650,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'IBM Plex Mono',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 2.6,
            color: '#ddd6c8',
          },
        },
        e('div', {
          style: {
            display: 'flex',
            width: 46,
            height: 5,
            marginRight: 14,
            backgroundColor: story.color,
          },
        }),
        story.eyebrow,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 640,
            marginTop: 36,
            fontSize: story.titleSize ?? 76,
            fontWeight: 600,
            letterSpacing: -4.2,
            lineHeight: 0.96,
            color: '#f5f1e8',
          },
        },
        story.title,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 590,
            marginTop: 44,
            fontSize: 29,
            lineHeight: 1.34,
            color: '#ddd6c8',
          },
        },
        story.body,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 72,
          bottom: 58,
          fontFamily: 'IBM Plex Mono',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 1.8,
          color: '#c5bdaf',
        },
      },
      story.source.toUpperCase(),
    ),
  ]);
}

function xSummary(): ReactNode {
  return canvas(X_WIDTH, X_HEIGHT, [
    background(art.x, X_WIDTH, X_HEIGHT),
    e('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 900,
        backgroundImage:
          'linear-gradient(90deg, rgba(7, 8, 10, 0.94) 0%, rgba(7, 8, 10, 0.8) 68%, rgba(7, 8, 10, 0) 100%)',
      },
    }),
    brandRail(X_WIDTH, true),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 70,
          top: 190,
          width: 650,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 2.6,
            color: '#d5cec0',
          },
        },
        'ONE WEEK TO GO',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 28,
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: -4.5,
            lineHeight: 0.92,
          },
        },
        e('div', { style: { display: 'flex' } }, 'The latest'),
        e('div', { style: { display: 'flex' } }, 'Monza news.'),
      ),
      e(
        'div',
        { style: { display: 'flex', marginTop: 42 } },
        italianStripe(190),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 24,
            fontSize: 22,
            color: '#d5cec0',
          },
        },
        '4–6 September 2026',
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
  await import('node:fs/promises').then(({ readFile }) =>
    readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  ),
);

await render('cover.png', cover(), INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT);
for (const story of stories) {
  await render(
    story.filename,
    storyCard(story),
    INSTAGRAM_WIDTH,
    INSTAGRAM_HEIGHT,
  );
}
await render('monza-news-roundup-x.png', xSummary(), X_WIDTH, X_HEIGHT);

console.log(`Wrote Monza news-roundup artwork to ${artifactOutputDir}`);
