import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors, teams } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';

const WIDTH = 1600;
const HEIGHT = 900;
const GUTTER = 72;
const OUTPUT_DIR = fileURLToPath(
  new URL('../../../artifacts/social/x-launch-2026/images/', import.meta.url),
);
const PUBLIC_OUTPUT_DIR = fileURLToPath(
  new URL('../public/social/x-launch-2026/', import.meta.url),
);

interface DriverVisual {
  code: string;
  displayName: string;
  flag: 'au' | 'gb' | 'it' | 'mc';
  number: number;
  team: 'Ferrari' | 'McLaren' | 'Mercedes';
}

const drivers: DriverVisual[] = [
  {
    code: 'NOR',
    displayName: 'Lando Norris',
    flag: 'gb',
    number: 1,
    team: 'McLaren',
  },
  {
    code: 'LEC',
    displayName: 'Charles Leclerc',
    flag: 'mc',
    number: 16,
    team: 'Ferrari',
  },
  {
    code: 'ANT',
    displayName: 'Kimi Antonelli',
    flag: 'it',
    number: 12,
    team: 'Mercedes',
  },
  {
    code: 'PIA',
    displayName: 'Oscar Piastri',
    flag: 'au',
    number: 81,
    team: 'McLaren',
  },
  {
    code: 'HAM',
    displayName: 'Lewis Hamilton',
    flag: 'gb',
    number: 44,
    team: 'Ferrari',
  },
];

const flags = Object.fromEntries(
  ['au', 'gb', 'it', 'mc'].map((countryCode) => [
    countryCode,
    `data:image/svg+xml;base64,${readFileSync(
      new URL(`../public/flags/${countryCode}.svg`, import.meta.url),
    ).toString('base64')}`,
  ]),
) as Record<DriverVisual['flag'], string>;

function frame(...children: ReactNode[]): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width: WIDTH,
        height: HEIGHT,
        overflow: 'hidden',
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: 'Archivo',
      },
    },
    ...children,
  );
}

function mark(scale = 1): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 7 * scale,
        width: 82 * scale,
        height: 64 * scale,
      },
    },
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

function brandRail(section: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'absolute',
        left: GUTTER,
        right: GUTTER,
        top: 46,
        height: 52,
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
          letterSpacing: 2.8,
          color: colors.textMuted,
        },
      },
      'GRAND PRIX PICKS',
      e('div', {
        style: {
          width: 38,
          height: 1,
          margin: '0 18px',
          backgroundColor: colors.borderStrong,
        },
      }),
      e(
        'div',
        { style: { display: 'flex', color: colors.textDisabled } },
        section,
      ),
    ),
    mark(0.55),
  );
}

function footer(note: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'absolute',
        left: GUTTER,
        right: GUTTER,
        bottom: 38,
        paddingTop: 18,
        borderTop: `1px solid ${colors.borderStrong}`,
        fontFamily: 'IBM Plex Mono',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: 1.7,
        color: colors.textMuted,
      },
    },
    e('div', { style: { display: 'flex' } }, note),
    e(
      'div',
      { style: { display: 'flex', color: colors.accent } },
      'GrandPrixPicks.com',
    ),
  );
}

function eyebrow(text: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize: 17,
        fontWeight: 600,
        letterSpacing: 3,
        color: colors.textMuted,
      },
    },
    text,
  );
}

function flag(driver: DriverVisual, width = 27): ReactNode {
  return e('img', {
    src: flags[driver.flag],
    width,
    height: Math.round(width * 0.67),
    style: {
      objectFit: 'cover',
      border: `1px solid ${colors.borderStrong}`,
    },
  });
}

function compactDriverRow(driver: DriverVisual, position: number): ReactNode {
  const teamColor = teams[driver.team];
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        height: 60,
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.surface,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          width: 58,
          borderRight: `1px solid ${colors.border}`,
          fontFamily: 'IBM Plex Mono',
          fontSize: 15,
          fontWeight: 600,
          color: position === 1 ? colors.accent : colors.textMuted,
        },
      },
      `P${position}`,
    ),
    e('div', {
      style: {
        position: 'absolute',
        left: 58,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: teamColor,
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          paddingLeft: 22,
        },
      },
      flag(driver),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            marginLeft: 14,
          },
        },
        e(
          'div',
          { style: { display: 'flex', fontSize: 18, fontWeight: 600 } },
          driver.displayName,
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginLeft: 12,
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
              color: colors.textMuted,
            },
          },
          `${driver.code}  #${driver.number}`,
        ),
      ),
    ),
  );
}

function topFivePanel(): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.surface,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 52,
          padding: '0 18px',
          fontFamily: 'IBM Plex Mono',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.8,
          color: colors.textMuted,
        },
      },
      e('div', { style: { display: 'flex' } }, 'RANK THE TOP 5'),
      e('div', { style: { display: 'flex', color: colors.accent } }, '5 OF 5'),
    ),
    ...drivers.map((driver, index) => compactDriverRow(driver, index + 1)),
  );
}

function h2hChoice(driver: DriverVisual, selected: boolean): ReactNode {
  const teamColor = teams[driver.team];
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        flex: 1,
        height: 84,
        padding: '0 18px 0 22px',
        border: `1px solid ${selected ? colors.accent : colors.borderStrong}`,
        backgroundColor: selected ? colors.accentMuted : colors.surface,
      },
    },
    e('div', {
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: teamColor,
      },
    }),
    flag(driver, 30),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          marginLeft: 13,
        },
      },
      e(
        'div',
        { style: { display: 'flex', fontSize: 17, fontWeight: 600 } },
        driver.displayName,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 5,
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: colors.textMuted,
          },
        },
        `${driver.code}  #${driver.number}`,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 25,
          height: 25,
          border: `2px solid ${selected ? colors.accent : colors.borderStrong}`,
          borderRadius: 999,
        },
      },
      selected
        ? e('div', {
            style: {
              width: 9,
              height: 9,
              borderRadius: 999,
              backgroundColor: colors.accent,
            },
          })
        : '',
    ),
  );
}

function h2hPanel(): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        marginTop: 16,
        padding: '17px 18px 18px',
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.surface,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          fontFamily: 'IBM Plex Mono',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1.5,
          color: colors.textMuted,
        },
      },
      e('div', { style: { display: 'flex' } }, 'TEAM-MATE HEAD-TO-HEAD'),
      e('div', { style: { display: 'flex' } }, 'WHO FINISHES AHEAD?'),
    ),
    e(
      'div',
      { style: { display: 'flex', gap: 10 } },
      h2hChoice(drivers[0]!, true),
      h2hChoice(drivers[3]!, false),
    ),
  );
}

function productPost(): ReactNode {
  return frame(
    brandRail('HOW IT WORKS'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          top: 190,
          width: 570,
        },
      },
      eyebrow('FREE F1 PREDICTION GAME'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 24,
            fontSize: 78,
            fontWeight: 300,
            letterSpacing: -2.2,
            lineHeight: 1.02,
          },
        },
        e('div', { style: { display: 'flex' } }, 'Two calls.'),
        e(
          'div',
          { style: { display: 'flex', color: colors.accent } },
          'Every session.',
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            width: 500,
            marginTop: 34,
            fontSize: 25,
            lineHeight: 1.45,
            color: colors.textMuted,
          },
        },
        'Rank the Top 5. Pick who finishes ahead in every team-mate battle.',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginTop: 44,
            fontFamily: 'IBM Plex Mono',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.6,
            color: colors.textMuted,
          },
        },
        e('div', {
          style: {
            width: 9,
            height: 9,
            marginRight: 12,
            borderRadius: 999,
            backgroundColor: colors.accent,
          },
        }),
        'QUALIFYING  /  SPRINTS  /  RACES',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 720,
          right: GUTTER,
          top: 137,
        },
      },
      topFivePanel(),
      h2hPanel(),
    ),
    footer('GLOBAL LEADERBOARD  /  PRIVATE LEAGUES'),
  );
}

function scoreCard(
  points: string,
  label: string,
  detail: string,
  color: string,
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: 420,
        padding: '34px 30px 28px',
        border: `1px solid ${colors.borderStrong}`,
        borderBottom: `10px solid ${color}`,
        backgroundColor: colors.surface,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          fontFamily: 'IBM Plex Mono',
          color,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: 108,
            fontWeight: 600,
            lineHeight: 1,
          },
        },
        points,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginLeft: 12,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2.3,
          },
        },
        points === '1' ? 'POINT' : 'POINTS',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 28,
          fontSize: 27,
          fontWeight: 600,
          color: colors.text,
        },
      },
      label,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          width: 210,
          marginTop: 14,
          fontSize: 18,
          lineHeight: 1.4,
          color: colors.textMuted,
        },
      },
      detail,
    ),
  );
}

function scoringPost(): ReactNode {
  return frame(
    brandRail('SCORING'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          top: 214,
          width: 530,
        },
      },
      eyebrow('HOW SCORING WORKS'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 24,
            fontSize: 82,
            fontWeight: 300,
            letterSpacing: -2.4,
            lineHeight: 1.02,
          },
        },
        e('div', { style: { display: 'flex' } }, 'Close still'),
        e('div', { style: { display: 'flex' } }, 'counts.'),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            width: 450,
            marginTop: 30,
            fontSize: 24,
            lineHeight: 1.45,
            color: colors.textMuted,
          },
        },
        'Every Top 5 prediction scores on its own.',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginTop: 42,
            fontFamily: 'IBM Plex Mono',
            fontSize: 14,
            letterSpacing: 1.6,
            color: colors.textMuted,
          },
        },
        e('div', {
          style: {
            width: 9,
            height: 9,
            marginRight: 12,
            borderRadius: 999,
            backgroundColor: colors.resultNear,
          },
        }),
        'NEAR MISSES ARE NOT WORTHLESS',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 620,
          right: GUTTER,
          top: 206,
          gap: 16,
        },
      },
      scoreCard(
        '5',
        'Exact position',
        'Your driver finishes exactly where you called it.',
        colors.resultExact,
      ),
      scoreCard(
        '3',
        'One place away',
        'Your prediction misses by a single position.',
        colors.resultNear,
      ),
      scoreCard(
        '1',
        'Actual Top 5',
        'Your driver still finishes inside the Top 5.',
        colors.resultTop5,
      ),
    ),
    footer('TOP 5 SCORING  /  TEAM-MATE CALLS SCORE SEPARATELY'),
  );
}

interface Standing {
  position: number;
  name: string;
  points: number;
  isYou?: boolean;
}

function standingRow(row: Standing): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        height: 58,
        padding: '0 18px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: row.isYou ? colors.accentMuted : colors.surface,
        fontSize: 17,
        color: row.isYou ? colors.text : colors.textMuted,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          width: 46,
          fontFamily: 'IBM Plex Mono',
          color: row.isYou ? colors.accent : colors.textDisabled,
        },
      },
      row.position,
    ),
    e(
      'div',
      {
        style: { display: 'flex', flex: 1, fontWeight: row.isYou ? 600 : 400 },
      },
      row.name,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          color: row.isYou ? colors.accent : colors.textMuted,
        },
      },
      row.points,
    ),
  );
}

function standingsPanel(
  label: string,
  meta: string,
  rows: Standing[],
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.surface,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          padding: '0 18px',
          fontFamily: 'IBM Plex Mono',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.7,
          color: colors.textMuted,
        },
      },
      e('div', { style: { display: 'flex' } }, label),
      e(
        'div',
        { style: { display: 'flex', color: colors.textDisabled } },
        meta,
      ),
    ),
    ...rows.map((row) => standingRow(row)),
  );
}

function competitionPost(): ReactNode {
  const score = 455;
  return frame(
    brandRail('LEADERBOARDS'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          top: 192,
          width: 530,
        },
      },
      eyebrow('ACROSS THE SEASON'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 24,
            fontSize: 78,
            fontWeight: 300,
            letterSpacing: -2.3,
            lineHeight: 1.03,
          },
        },
        e('div', { style: { display: 'flex' } }, 'One score.'),
        e('div', { style: { display: 'flex' } }, 'Two tables.'),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            width: 480,
            marginTop: 30,
            fontSize: 23,
            lineHeight: 1.45,
            color: colors.textMuted,
          },
        },
        'Your saved picks count globally and in every private league you join.',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 40,
            fontFamily: 'IBM Plex Mono',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.6,
            color: colors.accent,
          },
        },
        'SAME PICKS  /  SAME SCORE',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'absolute',
          left: 605,
          right: GUTTER,
          top: 155,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: 'IBM Plex Mono',
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 92,
              fontWeight: 600,
              lineHeight: 1,
              color: colors.accent,
            },
          },
          score,
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginTop: 4,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              color: colors.textMuted,
            },
          },
          'YOUR SCORE',
        ),
      ),
      e('div', {
        style: {
          width: 2,
          height: 54,
          marginTop: 12,
          backgroundColor: colors.accent,
        },
      }),
      e('div', {
        style: {
          width: 495,
          height: 2,
          backgroundColor: colors.accent,
        },
      }),
      e(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            width: 497,
          },
        },
        e('div', {
          style: { width: 2, height: 34, backgroundColor: colors.accent },
        }),
        e('div', {
          style: { width: 2, height: 34, backgroundColor: colors.accent },
        }),
      ),
      e(
        'div',
        { style: { display: 'flex', width: '100%', gap: 18 } },
        standingsPanel('GLOBAL LEADERBOARD', 'SEASON', [
          { position: 11, name: 'LateBraker', points: 462 },
          { position: 12, name: 'You', points: score, isYou: true },
          { position: 13, name: 'Box Box Sam', points: 443 },
        ]),
        standingsPanel('PRIVATE LEAGUE', '8 PLAYERS', [
          { position: 1, name: 'You', points: score, isYou: true },
          { position: 2, name: 'Box Box Sam', points: 443 },
          { position: 3, name: 'Undercut Enjoyer', points: 428 },
        ]),
      ),
    ),
    footer('QUALIFYING  /  SPRINTS  /  RACES'),
  );
}

const posts: Array<[filename: string, artwork: ReactNode]> = [
  ['01-what-is-grand-prix-picks.png', productPost()],
  ['02-how-scoring-works.png', scoringPost()],
  ['03-global-private-leagues.png', competitionPost()],
];

async function main() {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );
  await Promise.all([
    mkdir(OUTPUT_DIR, { recursive: true }),
    mkdir(PUBLIC_OUTPUT_DIR, { recursive: true }),
  ]);
  const fonts = await loadFonts();

  for (const [filename, artwork] of posts) {
    const svg = await satori(artwork, { width: WIDTH, height: HEIGHT, fonts });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
      .render()
      .asPng();
    const outputPath = join(OUTPUT_DIR, filename);
    await Promise.all([
      writeFile(outputPath, png),
      writeFile(join(PUBLIC_OUTPUT_DIR, filename), png),
    ]);
    console.log('Wrote %s (%d x %d)', outputPath, WIDTH, HEIGHT);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
