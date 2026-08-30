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
  tyresInstagram: artSource('monza-tyres-instagram-art.png'),
  tyresX: artSource('monza-tyres-x-art.png'),
  alpineInstagram: artSource('monza-alpine-upgrade-instagram-art.png'),
  alpineX: artSource('monza-alpine-x-art.png'),
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

type StandaloneNewsPost = {
  filename: string;
  art: string;
  section: string;
  sectionDetail: string;
  title: string;
  body: string;
  source: string;
  colors: readonly [string, string];
  titleSize: number;
  compounds?: readonly string[];
};

const standalonePosts: readonly StandaloneNewsPost[] = [
  {
    filename: 'monza-tyres',
    art: art.tyresInstagram,
    section: 'PIRELLI',
    sectionDetail: 'ITALIAN GP TYRES',
    title: 'Pirelli selects the softest tyre trio for Monza.',
    body: 'C3, C4 and C5 will be the hard, medium and soft compounds for the Italian Grand Prix.',
    source: 'PIRELLI  /  28 JUL 2026',
    colors: ['#f5dc16', '#d5212a'],
    titleSize: 66,
    compounds: ['C3', 'C4', 'C5'],
  },
  {
    filename: 'monza-alpine-upgrade',
    art: art.alpineInstagram,
    section: 'ALPINE',
    sectionDetail: 'MONZA UPGRADE',
    title: 'Alpine gives Colapinto its full upgrade package for Monza.',
    body: "The revised floor, diffuser, rear wing and sidepods debuted on Gasly's A526 at Zandvoort.",
    source: 'FORMULA 1  /  25 AUG 2026',
    colors: [teams.Alpine, '#f27eb2'],
    titleSize: 64,
  },
];

function newsBrandRail(width: number, compact = false): ReactNode {
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
        top: compact ? 38 : 46,
        width: width - gutter * 2,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 16 : 19,
        },
      },
      mark(compact ? 0.57 : 0.66),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: compact ? 18 : 21,
            fontWeight: 600,
            letterSpacing: compact ? 3 : 3.5,
            color: '#f5f1e8',
          },
        },
        'GRAND PRIX PICKS',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: compact ? 14 : 16,
          fontWeight: 600,
          letterSpacing: 2.5,
          color: '#c5bdaf',
          padding: compact ? '8px 11px' : '9px 12px',
          border: '1px solid rgba(212,255,63,0.5)',
          backgroundColor: 'rgba(7,8,10,0.72)',
        },
      },
      'MONZA  /  2026',
    ),
  );
}

function newsIdentity(post: StandaloneNewsPost, compact = false): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 15 : 18,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          width: compact ? 86 : 104,
          height: compact ? 9 : 11,
          transform: 'skew(-12deg)',
        },
      },
      e('div', {
        style: {
          display: 'flex',
          width: '68%',
          backgroundColor: post.colors[0],
        },
      }),
      e('div', {
        style: {
          display: 'flex',
          width: '32%',
          backgroundColor: post.colors[1],
        },
      }),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          gap: compact ? 12 : 15,
          fontFamily: 'IBM Plex Mono',
          fontWeight: 600,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: compact ? 21 : 25,
            letterSpacing: 2.5,
            color: colors.accent,
          },
        },
        post.section,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: compact ? 13 : 15,
            letterSpacing: 2.2,
            color: '#c5bdaf',
          },
        },
        post.sectionDetail,
      ),
    ),
  );
}

function compoundRail(compounds: readonly string[]): ReactNode {
  const compoundStyles = [
    { label: 'HARD', color: '#f2f1eb' },
    { label: 'MEDIUM', color: '#ffd12e' },
    { label: 'SOFT', color: '#e33132' },
  ] as const;

  return e(
    'div',
    { style: { display: 'flex', gap: 12, marginTop: 42 } },
    ...compounds.map((compound, index) =>
      e(
        'div',
        {
          key: compound,
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            width: 116,
            height: 74,
            border: `1px solid ${compoundStyles[index]?.color ?? '#55585e'}`,
            borderTop: `6px solid ${compoundStyles[index]?.color ?? '#55585e'}`,
            backgroundColor: 'rgba(8,9,11,0.52)',
            fontFamily: 'IBM Plex Mono',
            color: '#f5f1e8',
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: 2,
            },
          },
          compound,
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginTop: 3,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: '#c5bdaf',
            },
          },
          compoundStyles[index]?.label ?? '',
        ),
      ),
    ),
  );
}

function standaloneInstagram(post: StandaloneNewsPost): ReactNode {
  return canvas(INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT, [
    background(post.art, INSTAGRAM_WIDTH, INSTAGRAM_HEIGHT),
    e('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 12,
        backgroundColor: colors.accent,
      },
    }),
    e('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 850,
        backgroundImage:
          'linear-gradient(90deg, rgba(7,8,10,0.97) 0%, rgba(7,8,10,0.86) 72%, rgba(7,8,10,0) 100%)',
      },
    }),
    newsBrandRail(INSTAGRAM_WIDTH),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 72,
          top: 218,
          width: 670,
        },
      },
      newsIdentity(post),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 650,
            marginTop: 42,
            fontSize: post.titleSize,
            fontWeight: 600,
            letterSpacing: -4.1,
            lineHeight: 0.97,
            color: '#f5f1e8',
          },
        },
        post.title,
      ),
      e('div', {
        style: {
          display: 'flex',
          width: 168,
          height: 9,
          marginTop: 28,
          backgroundColor: colors.accent,
          transform: 'skew(-12deg)',
        },
      }),
      post.compounds
        ? compoundRail(post.compounds)
        : e(
            'div',
            {
              style: {
                display: 'flex',
                alignSelf: 'flex-start',
                marginTop: 30,
                padding: '12px 17px',
                backgroundColor: colors.accent,
                color: '#101113',
                fontFamily: 'IBM Plex Mono',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: 2,
              },
            },
            'FULL PACKAGE  /  FOUR MAJOR SURFACES',
          ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 590,
            marginTop: 30,
            fontSize: 29,
            lineHeight: 1.34,
            color: '#ddd6c8',
          },
        },
        post.body,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 72,
          bottom: 56,
          fontFamily: 'IBM Plex Mono',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 2,
          color: colors.accent,
        },
      },
      `SOURCE  /  ${post.source}`,
    ),
  ]);
}

function standaloneX(post: StandaloneNewsPost, artSource: string): ReactNode {
  return canvas(X_WIDTH, X_HEIGHT, [
    background(artSource, X_WIDTH, X_HEIGHT),
    e('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 10,
        backgroundColor: colors.accent,
      },
    }),
    e('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 930,
        backgroundImage:
          'linear-gradient(90deg, rgba(7,8,10,0.97) 0%, rgba(7,8,10,0.84) 72%, rgba(7,8,10,0) 100%)',
      },
    }),
    newsBrandRail(X_WIDTH, true),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 70,
          top: 165,
          width: 770,
        },
      },
      newsIdentity(post, true),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 730,
            marginTop: 30,
            fontSize: post.filename === 'monza-tyres' ? 66 : 62,
            fontWeight: 600,
            letterSpacing: -3.8,
            lineHeight: 0.96,
            color: '#f5f1e8',
          },
        },
        post.title,
      ),
      e('div', {
        style: {
          display: 'flex',
          width: 142,
          height: 8,
          marginTop: 24,
          backgroundColor: colors.accent,
          transform: 'skew(-12deg)',
        },
      }),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: 660,
            marginTop: 23,
            fontSize: 23,
            lineHeight: 1.35,
            color: '#ddd6c8',
          },
        },
        post.body,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 70,
          bottom: 42,
          fontFamily: 'IBM Plex Mono',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.8,
          color: colors.accent,
        },
      },
      `SOURCE  /  ${post.source}`,
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
for (const post of standalonePosts) {
  await render(
    `${post.filename}-instagram.png`,
    standaloneInstagram(post),
    INSTAGRAM_WIDTH,
    INSTAGRAM_HEIGHT,
  );
  await render(
    `${post.filename}-x.png`,
    standaloneX(
      post,
      post.filename === 'monza-tyres' ? art.tyresX : art.alpineX,
    ),
    X_WIDTH,
    X_HEIGHT,
  );
}

console.log(`Wrote Monza news-roundup artwork to ${artifactOutputDir}`);
