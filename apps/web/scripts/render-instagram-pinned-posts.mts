import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { colors, teams } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';

const WIDTH = 1080;
const HEIGHT = 1350;
const GUTTER = 88;
const CAMPAIGN_OUTPUT_DIR = fileURLToPath(
  new URL(
    '../../../artifacts/social/instagram-launch-2026/images/',
    import.meta.url,
  ),
);

interface DriverVisual {
  code: string;
  displayName: string;
  flag: 'au' | 'gb' | 'it' | 'mc';
  number: number;
  team: 'Ferrari' | 'McLaren' | 'Mercedes';
}

const exampleTopFive: DriverVisual[] = [
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

const flagSources = Object.fromEntries(
  ['au', 'gb', 'it', 'mc'].map((countryCode) => [
    countryCode,
    `data:image/svg+xml;base64,${readFileSync(
      new URL(`../public/flags/${countryCode}.svg`, import.meta.url),
    ).toString('base64')}`,
  ]),
) as Record<DriverVisual['flag'], string>;

/**
 * Renders the launch carousel for the first pinned Instagram post.
 *
 * This is an extension of the product's "Timing Sheet Minimal" system, not a
 * separate social-media skin. Every visual has a job: the Top 5 rows explain
 * ranking, the paired controls explain H2H, and the two standings panels make
 * global and private competition explicit.
 *
 * Run from anywhere in the repository:
 *
 *   pnpm --filter @grandprixpicks/web render-instagram-pins
 */

function mark(scale = 1): ReactNode {
  const bars = [46, 72, 38];
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8 * scale,
        width: 90 * scale,
        height: 76 * scale,
      },
    },
    ...bars.map((height, index) =>
      e('div', {
        key: String(index),
        style: {
          width: 22 * scale,
          height: height * scale,
          backgroundColor: colors.accent,
          transform: 'skew(-12deg)',
        },
      }),
    ),
  );
}

function brandRail(): ReactNode {
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
        top: 72,
        height: 58,
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
          letterSpacing: 3.2,
          color: colors.textMuted,
        },
      },
      'GRAND PRIX PICKS',
    ),
    mark(0.58),
  );
}

function footer(text = 'FREE F1 PREDICTION GAME'): ReactNode {
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
        bottom: 64,
        paddingTop: 22,
        borderTop: `1px solid ${colors.borderStrong}`,
        fontFamily: 'IBM Plex Mono',
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: 2.2,
        color: colors.textMuted,
      },
    },
    e('div', { style: { display: 'flex' } }, text),
    e('div', { style: { display: 'flex', color: colors.accent } }, 'GPP'),
  );
}

function eyebrow(text: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize: 20,
        fontWeight: 500,
        letterSpacing: 3.4,
        color: colors.textMuted,
        textTransform: 'uppercase',
      },
    },
    text,
  );
}

function panelLabel(text: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: 2.2,
        color: colors.textMuted,
      },
    },
    text,
  );
}

function headline(text: string, fontSize = 88, width = 860): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        width,
        marginTop: 24,
        fontSize,
        fontWeight: 300,
        letterSpacing: -2.1,
        lineHeight: 1.04,
        color: colors.text,
      },
    },
    text,
  );
}

function body(text: string, width = 770): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        width,
        marginTop: 28,
        fontSize: 31,
        fontWeight: 400,
        lineHeight: 1.42,
        color: colors.textMuted,
      },
    },
    text,
  );
}

function contentHeader(
  label: string,
  title: string,
  copy: string,
  options: { fontSize?: number; width?: number; top?: number } = {},
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        left: GUTTER,
        top: options.top ?? 205,
      },
    },
    eyebrow(label),
    headline(title, options.fontSize ?? 88, options.width ?? 860),
    body(copy, options.width ?? 820),
  );
}

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
    e('div', {
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 12,
        height: HEIGHT,
        backgroundColor: colors.accent,
      },
    }),
    brandRail(),
    ...children,
  );
}

function positionBadge(position: number, active = false): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 68,
        height: 46,
        border: `1px solid ${active ? colors.accent : colors.borderStrong}`,
        backgroundColor: active ? colors.accent : 'transparent',
        fontFamily: 'IBM Plex Mono',
        fontSize: 21,
        fontWeight: 600,
        color: active ? colors.textOnAccent : colors.textMuted,
      },
    },
    `P${position}`,
  );
}

function topFivePanel(compact = false): ReactNode {
  const rowHeight = compact ? 62 : 92;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        borderTop: `1px solid ${colors.borderStrong}`,
      },
    },
    ...Array.from({ length: 5 }, (_, index) =>
      e(
        'div',
        {
          key: String(index),
          style: {
            display: 'flex',
            alignItems: 'center',
            height: rowHeight,
            borderBottom: `1px solid ${colors.border}`,
          },
        },
        positionBadge(index + 1, index === 0),
        e(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              marginLeft: 26,
              fontFamily: 'IBM Plex Mono',
              fontSize: compact ? 16 : 19,
              letterSpacing: 1.7,
              color: index === 0 ? colors.textMuted : colors.textDisabled,
            },
          },
          index === 0 ? 'CHOOSE A DRIVER' : '',
        ),
        e('div', {
          style: {
            width: compact ? 210 : 310,
            height: 1,
            borderBottom: `1px solid ${colors.borderStrong}`,
          },
        }),
      ),
    ),
  );
}

function coverSlide(): ReactNode {
  return frame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          top: 210,
          width: 850,
        },
      },
      eyebrow('Free F1 prediction game'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 30,
            fontSize: 92,
            fontWeight: 300,
            letterSpacing: -2.4,
            lineHeight: 1.03,
          },
        },
        e('div', { style: { display: 'flex' } }, "Everyone's a strategist"),
        e('div', { style: { display: 'flex' } }, 'on Sunday.'),
        e(
          'div',
          { style: { display: 'flex', color: colors.accent } },
          'Prove it.',
        ),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 750,
        },
      },
      topFivePanel(true),
    ),
    footer(),
  );
}

function topFiveSlide(): ReactNode {
  return frame(
    contentHeader(
      'The main game',
      'Pick the Top 5',
      'Rank the five drivers you expect to finish at the front. Order matters.',
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 665,
        },
      },
      topFivePanel(),
    ),
    footer(),
  );
}

function matchChoice(label: string, selected: boolean): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        height: 82,
        padding: '0 26px',
        border: `1px solid ${selected ? colors.accent : colors.borderStrong}`,
        backgroundColor: selected ? colors.accentMuted : colors.surface,
        fontSize: 25,
        fontWeight: selected ? 600 : 400,
        color: selected ? colors.text : colors.textMuted,
      },
    },
    e('div', { style: { display: 'flex' } }, label),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          border: `2px solid ${selected ? colors.accent : colors.borderStrong}`,
          borderRadius: 999,
        },
      },
      selected
        ? e('div', {
            style: {
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: colors.accent,
            },
          })
        : '',
    ),
  );
}

function matchupRow(index: number): ReactNode {
  const selectLeft = index !== 1;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        padding: '26px 0',
        borderTop: `1px solid ${colors.border}`,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginBottom: 14,
          fontFamily: 'IBM Plex Mono',
          fontSize: 15,
          letterSpacing: 2.2,
          color: colors.textDisabled,
        },
      },
      'WHO FINISHES AHEAD?',
    ),
    e(
      'div',
      { style: { display: 'flex', gap: 16 } },
      matchChoice('Driver A', selectLeft),
      matchChoice('Driver B', !selectLeft),
    ),
  );
}

function h2hSlide(): ReactNode {
  return frame(
    contentHeader(
      'Bonus game',
      'Call every team-mate battle',
      'Choose which driver will finish ahead in each pairing.',
      { fontSize: 80, width: 880 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 600,
        },
      },
      matchupRow(0),
      matchupRow(1),
      matchupRow(2),
    ),
    footer(),
  );
}

function sessionRow(name: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        height: 66,
        borderTop: `1px solid ${colors.border}`,
        fontSize: 24,
        color: colors.text,
      },
    },
    e('div', {
      style: {
        width: 9,
        height: 9,
        marginRight: 18,
        borderRadius: 999,
        backgroundColor: colors.accent,
      },
    }),
    name,
  );
}

function weekendPanel(
  title: string,
  sessions: string[],
  width: number,
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width,
        padding: '34px 34px 24px',
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.surface,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginBottom: 22,
          fontFamily: 'IBM Plex Mono',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: 2.4,
          color: colors.textMuted,
        },
      },
      title,
    ),
    ...sessions.map((session) => sessionRow(session)),
  );
}

function sessionsSlide(): ReactNode {
  return frame(
    contentHeader(
      'Race weekend',
      'Play every competitive session',
      'Qualifying and the race. Plus sprint qualifying and the sprint on sprint weekends.',
      { fontSize: 76, width: 890 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 650,
          gap: 24,
        },
      },
      weekendPanel('REGULAR WEEKEND', ['Qualifying', 'Race'], 390),
      weekendPanel(
        'SPRINT WEEKEND',
        ['Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'],
        490,
      ),
    ),
    footer(),
  );
}

function standingRow(
  position: string,
  name: string,
  points: string,
  isYou = false,
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        height: 58,
        padding: '0 18px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: isYou ? colors.accentMuted : 'transparent',
        fontSize: 20,
        color: isYou ? colors.text : colors.textMuted,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          width: 52,
          fontFamily: 'IBM Plex Mono',
          color: isYou ? colors.accent : colors.textDisabled,
        },
      },
      position,
    ),
    e(
      'div',
      { style: { display: 'flex', flex: 1, fontWeight: isYou ? 600 : 400 } },
      name,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          color: isYou ? colors.accent : colors.textMuted,
        },
      },
      points,
    ),
  );
}

function standingsPanel(
  label: string,
  rows: Array<[string, string, string, boolean?]>,
): ReactNode {
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
          height: 62,
          padding: '0 18px',
          fontFamily: 'IBM Plex Mono',
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 2.2,
          color: colors.textMuted,
        },
      },
      e('div', { style: { display: 'flex' } }, label),
      e('div', { style: { display: 'flex' } }, 'PTS'),
    ),
    ...rows.map(([position, name, points, isYou]) =>
      standingRow(position, name, points, isYou),
    ),
  );
}

function competitionSlide(): ReactNode {
  return frame(
    contentHeader(
      'Across the season',
      'Score across the season',
      'Every session adds to the global leaderboard and your private leagues.',
      { fontSize: 80, width: 880, top: 190 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 610,
          gap: 22,
        },
      },
      standingsPanel('GLOBAL LEADERBOARD', [
        ['1', 'ApexHunter', '486'],
        ['2', 'LateBraker', '471'],
        ['3', 'You', '455', true],
      ]),
      standingsPanel('PRIVATE LEAGUE', [
        ['1', 'You', '455', true],
        ['2', 'BoxBoxSam', '443'],
        ['3', 'SundayStrategy', '428'],
      ]),
    ),
    footer(),
  );
}

function ctaSlide(): ReactNode {
  return frame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 260,
        },
      },
      mark(1.35),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 80,
            fontFamily: 'IBM Plex Mono',
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: 3.4,
            color: colors.textMuted,
          },
        },
        'MAKE YOUR FIRST PICKS',
      ),
      headline('Free to play. Built for F1 fans.', 92, 860),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            height: 86,
            marginTop: 64,
            padding: '0 30px',
            backgroundColor: colors.accent,
            fontFamily: 'IBM Plex Mono',
            fontSize: 26,
            fontWeight: 600,
            color: colors.textOnAccent,
          },
        },
        'GrandPrixPicks.com/ig',
      ),
    ),
    footer('LINK IN BIO'),
  );
}

function scoreBand(points: string, label: string, color: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: 210,
        padding: '30px 26px',
        borderTop: `3px solid ${color}`,
        backgroundColor: colors.surface,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: 64,
          fontWeight: 600,
          color,
        },
      },
      points,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 12,
          fontSize: 20,
          lineHeight: 1.25,
          color: colors.textMuted,
        },
      },
      label,
    ),
  );
}

function scoringCoverSlide(): ReactNode {
  return frame(
    contentHeader(
      'How scoring works',
      'Close still counts.',
      'Your prediction does not need to be perfect to score.',
      { fontSize: 94, top: 235 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 730,
          gap: 18,
        },
      },
      scoreBand('5', 'Exact position', colors.resultExact),
      scoreBand('3', 'One place away', colors.resultNear),
      scoreBand('1', 'In the Top 5', colors.resultTop5),
    ),
    footer(),
  );
}

function scoringRuleSlide(
  points: string,
  title: string,
  example: string,
  color: string,
  note?: string,
): ReactNode {
  return frame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 225,
        },
      },
      eyebrow('Top 5 scoring'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            marginTop: 38,
            fontFamily: 'IBM Plex Mono',
            color,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 184,
              fontWeight: 600,
              lineHeight: 0.9,
            },
          },
          points,
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginLeft: 20,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 3,
            },
          },
          points === '1' ? 'POINT' : 'POINTS',
        ),
      ),
      headline(title, 84, 860),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            marginTop: 62,
            padding: '34px 38px',
            border: `1px solid ${colors.borderStrong}`,
            borderLeft: `5px solid ${color}`,
            backgroundColor: colors.surface,
          },
        },
        eyebrow('Example'),
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginTop: 18,
              fontSize: 30,
              lineHeight: 1.4,
              color: colors.text,
            },
          },
          example,
        ),
      ),
      note
        ? e(
            'div',
            {
              style: {
                display: 'flex',
                width: 830,
                marginTop: 26,
                fontSize: 22,
                lineHeight: 1.45,
                color: colors.textMuted,
              },
            },
            note,
          )
        : '',
    ),
    footer(),
  );
}

function h2hScoringSlide(): ReactNode {
  return frame(
    contentHeader(
      'Team-mate Head-to-Head',
      'Correct call. +1 point.',
      'Pick the driver who finishes ahead in a team-mate matchup.',
      { fontSize: 82, width: 880, top: 220 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 690,
          padding: '42px 38px',
          border: `1px solid ${colors.borderStrong}`,
          backgroundColor: colors.surface,
        },
      },
      matchChoice('Driver A', true),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '0 22px',
            fontFamily: 'IBM Plex Mono',
            fontSize: 18,
            color: colors.textDisabled,
          },
        },
        'OR',
      ),
      matchChoice('Driver B', false),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: GUTTER,
          top: 940,
          fontFamily: 'IBM Plex Mono',
          fontSize: 22,
          color: colors.resultNear,
        },
      },
      'CORRECT  +1',
    ),
    footer(),
  );
}

function perfectTopFiveSlide(): ReactNode {
  return frame(
    contentHeader(
      'Maximum Top 5 score',
      'A perfect Top 5 earns 25 points',
      'Correct team-mate calls add to your Combined score.',
      { fontSize: 76, width: 900, top: 210 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 675,
          gap: 12,
        },
      },
      ...Array.from({ length: 5 }, (_, index) =>
        e(
          'div',
          {
            key: String(index),
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              height: 180,
              borderTop: `4px solid ${colors.resultExact}`,
              backgroundColor: colors.surface,
            },
          },
          e(
            'div',
            {
              style: {
                display: 'flex',
                fontFamily: 'IBM Plex Mono',
                fontSize: 17,
                color: colors.textMuted,
              },
            },
            `P${index + 1}`,
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                marginTop: 14,
                fontFamily: 'IBM Plex Mono',
                fontSize: 54,
                fontWeight: 600,
                color: colors.resultExact,
              },
            },
            '5',
          ),
        ),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          position: 'absolute',
          right: GUTTER,
          top: 910,
          fontFamily: 'IBM Plex Mono',
          color: colors.text,
        },
      },
      e(
        'div',
        { style: { display: 'flex', fontSize: 96, fontWeight: 600 } },
        '25',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginLeft: 18,
            fontSize: 20,
            letterSpacing: 2.4,
            color: colors.textMuted,
          },
        },
        'POINTS',
      ),
    ),
    footer(),
  );
}

function scoringLockSlide(): ReactNode {
  return frame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 250,
        },
      },
      eyebrow('Before lights out'),
      headline('Picks lock when the session starts', 84, 890),
      body('Change them as often as you like before then.', 820),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            marginTop: 92,
            padding: '34px 38px',
            border: `1px solid ${colors.accent}`,
            backgroundColor: colors.accentMuted,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: 'IBM Plex Mono',
              fontSize: 18,
              letterSpacing: 2.6,
              color: colors.textMuted,
            },
          },
          'READY TO SCORE?',
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginTop: 18,
              fontFamily: 'IBM Plex Mono',
              fontSize: 29,
              fontWeight: 600,
              color: colors.accent,
            },
          },
          'GrandPrixPicks.com/ig',
        ),
      ),
    ),
    footer('LINK IN BIO'),
  );
}

function competitionCoverSlide(): ReactNode {
  return frame(
    contentHeader(
      'Two ways to compete',
      'Global leaderboard. Private leagues.',
      'One set of picks counts in both.',
      { fontSize: 78, width: 900, top: 215 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 700,
          gap: 22,
        },
      },
      standingsPanel('GLOBAL LEADERBOARD', [
        ['1', 'Dave is P1 again', '486'],
        ['2', 'You', '471', true],
      ]),
      standingsPanel('PRIVATE LEAGUE', [
        ['1', 'You', '471', true],
        ['2', 'Undercut Enjoyer', '455'],
      ]),
    ),
    footer(),
  );
}

function globalLeaderboardSlide(): ReactNode {
  return frame(
    contentHeader(
      'Global leaderboard',
      'See how you rank against everyone',
      'Compare scores for the race weekend or the full season.',
      { fontSize: 76, width: 900, top: 205 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 655,
        },
      },
      standingsPanel('SEASON STANDINGS', [
        ['1', 'Dave is P1 again', '486'],
        ['2', 'Undercut Enjoyer', '471'],
        ['3', 'You', '455', true],
        ['4', 'Box Box Barbara', '443'],
        ['5', 'Two Stopper Truther', '428'],
      ]),
    ),
    footer(),
  );
}

function privateLeagueSlide(): ReactNode {
  return frame(
    contentHeader(
      'Private leagues',
      'Give your group chat a table',
      'Create a league and invite your friends with one link.',
      { fontSize: 78, width: 890, top: 205 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 660,
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
            height: 88,
            padding: '0 30px',
            borderBottom: `1px solid ${colors.border}`,
          },
        },
        e(
          'div',
          { style: { display: 'flex', fontSize: 28, fontWeight: 600 } },
          'Sunday Strategy Club',
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: 'IBM Plex Mono',
              fontSize: 16,
              color: colors.textMuted,
            },
          },
          '8 MEMBERS',
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            padding: '38px 30px',
          },
        },
        eyebrow('Invite link'),
        e(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 78,
              marginTop: 18,
              padding: '0 24px',
              border: `1px solid ${colors.accent}`,
              backgroundColor: colors.accentMuted,
              fontFamily: 'IBM Plex Mono',
              fontSize: 20,
              color: colors.text,
            },
          },
          e(
            'div',
            { style: { display: 'flex' } },
            'grandprixpicks.com/leagues/...',
          ),
          e(
            'div',
            { style: { display: 'flex', color: colors.accent } },
            'COPY',
          ),
        ),
      ),
    ),
    footer(),
  );
}

function destinationCard(label: string, copy: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: 390,
        minHeight: 170,
        padding: '30px 28px',
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.surface,
      },
    },
    eyebrow(label),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 20,
          fontSize: 25,
          lineHeight: 1.35,
          color: colors.text,
        },
      },
      copy,
    ),
  );
}

function oneSetOfPicksSlide(): ReactNode {
  return frame(
    contentHeader(
      'One prediction',
      'Make one set of picks',
      'Your results carry into the global standings and every private league you join.',
      { fontSize: 82, width: 900, top: 195 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 650,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 430,
            height: 90,
            backgroundColor: colors.accent,
            fontFamily: 'IBM Plex Mono',
            fontSize: 22,
            fontWeight: 600,
            color: colors.textOnAccent,
          },
        },
        'YOUR SAVED PICKS',
      ),
      e('div', {
        style: {
          width: 2,
          height: 72,
          backgroundColor: colors.accent,
        },
      }),
      e('div', {
        style: {
          width: 430,
          height: 2,
          backgroundColor: colors.accent,
        },
      }),
      e(
        'div',
        {
          style: {
            display: 'flex',
            gap: 70,
            marginTop: 0,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            },
          },
          e('div', {
            style: { width: 2, height: 52, backgroundColor: colors.accent },
          }),
          destinationCard('Global', 'Everyone'),
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            },
          },
          e('div', {
            style: { width: 2, height: 52, backgroundColor: colors.accent },
          }),
          destinationCard('Private leagues', 'Every league you join'),
        ),
      ),
    ),
    footer(),
  );
}

function sessionsMoveOrderSlide(): ReactNode {
  const sessionNames = ['Qualifying', 'Sprint', 'Sprint Qualifying', 'Race'];
  return frame(
    contentHeader(
      'Across the calendar',
      'Every session can move the order',
      'Qualifying, sprints and races all count across the season.',
      { fontSize: 77, width: 900, top: 205 },
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 670,
          gap: 20,
        },
      },
      ...sessionNames.map((session, index) =>
        e(
          'div',
          {
            key: session,
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: 442,
              height: 170,
              padding: '28px 30px',
              border: `1px solid ${colors.borderStrong}`,
              backgroundColor: colors.surface,
            },
          },
          e(
            'div',
            { style: { display: 'flex', fontSize: 26, fontWeight: 500 } },
            session,
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                fontFamily: 'IBM Plex Mono',
                fontSize: 18,
                color: index % 2 === 0 ? colors.resultNear : colors.accent,
              },
            },
            index % 2 === 0 ? 'RANK  ▲ 2' : 'RANK  ▲ 1',
          ),
        ),
      ),
    ),
    footer(),
  );
}

function competitionCtaSlide(): ReactNode {
  return frame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          top: 245,
        },
      },
      mark(1.35),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 80,
            fontFamily: 'IBM Plex Mono',
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: 3.4,
            color: colors.textMuted,
          },
        },
        'START YOUR SEASON',
      ),
      headline('Race the world. Challenge your friends.', 86, 880),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            height: 86,
            marginTop: 64,
            padding: '0 30px',
            backgroundColor: colors.accent,
            fontFamily: 'IBM Plex Mono',
            fontSize: 26,
            fontWeight: 600,
            color: colors.textOnAccent,
          },
        },
        'GrandPrixPicks.com/ig',
      ),
    ),
    footer('LINK IN BIO'),
  );
}

function editorialFrame(...children: ReactNode[]): ReactNode {
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

function wordmark(): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'absolute',
        left: 80,
        right: 80,
        top: 62,
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
          letterSpacing: 3.2,
          color: colors.textMuted,
        },
      },
      'GRAND PRIX PICKS',
    ),
    mark(0.62),
  );
}

function driverFlag(driver: DriverVisual, width = 36): ReactNode {
  return e('img', {
    src: flagSources[driver.flag],
    width,
    height: Math.round(width * 0.67),
    style: {
      objectFit: 'cover',
      border: `1px solid ${colors.borderStrong}`,
    },
  });
}

function driverRow(
  driver: DriverVisual,
  position: number,
  compact = false,
): ReactNode {
  const teamColor = teams[driver.team];
  const rowHeight = compact ? 62 : 94;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        height: rowHeight,
        borderBottom: `1px solid ${colors.border}`,
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
          width: compact ? 74 : 88,
          borderRight: `1px solid ${colors.border}`,
          fontFamily: 'IBM Plex Mono',
          fontSize: compact ? 16 : 20,
          fontWeight: 600,
          color: position === 1 ? colors.accent : colors.textMuted,
        },
      },
      `P${position}`,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          alignSelf: 'stretch',
          position: 'relative',
          width: compact ? 106 : 122,
          paddingLeft: compact ? 24 : 30,
          borderRight: `1px solid ${colors.border}`,
          fontFamily: 'IBM Plex Mono',
        },
      },
      e('div', {
        style: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          backgroundColor: teamColor,
        },
      }),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: compact ? 19 : 25,
            lineHeight: 1,
            color: colors.text,
          },
        },
        driver.number,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: compact ? 3 : 7,
            fontSize: compact ? 12 : 15,
            letterSpacing: 1.2,
            color: colors.textMuted,
          },
        },
        driver.code,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          paddingLeft: compact ? 24 : 32,
        },
      },
      driverFlag(driver, compact ? 30 : 38),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginLeft: compact ? 16 : 20,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: compact ? 19 : 25,
              fontWeight: 600,
              lineHeight: 1.1,
              color: colors.text,
            },
          },
          driver.displayName,
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              marginTop: compact ? 3 : 7,
              fontSize: compact ? 14 : 17,
              color: colors.textMuted,
            },
          },
          e('div', {
            style: {
              width: 7,
              height: 7,
              marginRight: 9,
              borderRadius: 999,
              backgroundColor: teamColor,
            },
          }),
          driver.team,
        ),
      ),
    ),
  );
}

function completedTopFive(compact = false): ReactNode {
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
          height: compact ? 54 : 62,
          padding: compact ? '0 20px' : '0 26px',
          fontFamily: 'IBM Plex Mono',
          fontSize: compact ? 13 : 15,
          fontWeight: 600,
          letterSpacing: 2.1,
          color: colors.textMuted,
        },
      },
      e('div', { style: { display: 'flex' } }, 'YOUR PICKS'),
      e('div', { style: { display: 'flex', color: colors.accent } }, '5 OF 5'),
    ),
    ...exampleTopFive.map((driver, index) =>
      driverRow(driver, index + 1, compact),
    ),
  );
}

function h2hDriverChoice(driver: DriverVisual, selected: boolean): ReactNode {
  const teamColor = teams[driver.team];
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        height: 98,
        padding: '0 24px 0 28px',
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
        width: 5,
        backgroundColor: teamColor,
      },
    }),
    driverFlag(driver, 36),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          marginLeft: 16,
        },
      },
      e(
        'div',
        { style: { display: 'flex', fontSize: 21, fontWeight: 600 } },
        driver.displayName,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 6,
            fontFamily: 'IBM Plex Mono',
            fontSize: 13,
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
          width: 30,
          height: 30,
          border: `2px solid ${selected ? colors.accent : colors.borderStrong}`,
          borderRadius: 999,
        },
      },
      selected
        ? e('div', {
            style: {
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: colors.accent,
            },
          })
        : '',
    ),
  );
}

function introCoverSlide(): ReactNode {
  return editorialFrame(
    wordmark(),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 80,
          top: 185,
          width: 900,
        },
      },
      eyebrow('Free F1 prediction game'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 30,
            fontSize: 96,
            fontWeight: 300,
            letterSpacing: -2.6,
            lineHeight: 1.02,
          },
        },
        e('div', { style: { display: 'flex' } }, "Everyone's a strategist"),
        e('div', { style: { display: 'flex' } }, 'on Sunday.'),
        e(
          'div',
          { style: { display: 'flex', color: colors.accent } },
          'Prove it.',
        ),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 80,
          right: 80,
          top: 730,
        },
      },
      completedTopFive(false),
    ),
  );
}

function introGameSlide(): ReactNode {
  return editorialFrame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 72,
          top: 82,
        },
      },
      eyebrow('How it works'),
      headline('Two calls. Every session.', 86, 900),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 72,
          right: 72,
          top: 350,
        },
      },
      panelLabel('RANK THE TOP 5'),
      e(
        'div',
        { style: { display: 'flex', width: '100%', marginTop: 18 } },
        completedTopFive(true),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 72,
          right: 72,
          top: 840,
        },
      },
      panelLabel('TEAM-MATE HEAD-TO-HEAD'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 18,
            padding: 18,
            border: `1px solid ${colors.borderStrong}`,
            backgroundColor: colors.surface,
            gap: 10,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 42,
              fontFamily: 'IBM Plex Mono',
              fontSize: 13,
              letterSpacing: 1.6,
              color: colors.textMuted,
            },
          },
          e('div', { style: { display: 'flex' } }, 'McLAREN'),
          e('div', { style: { display: 'flex' } }, 'WHO FINISHES AHEAD?'),
        ),
        h2hDriverChoice(exampleTopFive[0]!, true),
        h2hDriverChoice(exampleTopFive[3]!, false),
        e(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              height: 32,
              paddingTop: 8,
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: colors.accent,
            },
          },
          'PICK SAVED',
        ),
      ),
    ),
  );
}

function introPayoffSlide(): ReactNode {
  return editorialFrame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 80,
          top: 105,
        },
      },
      eyebrow('Across the season'),
      headline('One score. Two tables.', 94, 900),
      body('Qualifying, sprints and races all count.', 760),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 0,
          width: WIDTH,
          top: 405,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'IBM Plex Mono',
          color: colors.accent,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: 146,
            fontWeight: 600,
            lineHeight: 1,
          },
        },
        '455',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 6,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 2.3,
            color: colors.textMuted,
          },
        },
        'YOUR SCORE',
      ),
    ),
    e('div', {
      style: {
        position: 'absolute',
        left: 539,
        top: 585,
        width: 2,
        height: 84,
        backgroundColor: colors.accent,
      },
    }),
    e('div', {
      style: {
        position: 'absolute',
        left: 300,
        top: 668,
        width: 480,
        height: 2,
        backgroundColor: colors.accent,
      },
    }),
    e('div', {
      style: {
        position: 'absolute',
        left: 302,
        top: 668,
        width: 2,
        height: 47,
        backgroundColor: colors.accent,
      },
    }),
    e('div', {
      style: {
        position: 'absolute',
        left: 777,
        top: 668,
        width: 2,
        height: 47,
        backgroundColor: colors.accent,
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 80,
          right: 80,
          top: 715,
          gap: 28,
        },
      },
      e(
        'div',
        { style: { display: 'flex', width: 446 } },
        standingsPanel('GLOBAL LEADERBOARD', [
          ['1', 'Dave is P1 again', '486'],
          ['2', 'You', '455', true],
          ['3', 'Undercut Enjoyer', '443'],
        ]),
      ),
      e(
        'div',
        { style: { display: 'flex', width: 446 } },
        standingsPanel('PRIVATE LEAGUE', [
          ['1', 'You', '455', true],
          ['2', 'Box Box Barbara', '443'],
          ['3', 'Two Stopper Truther', '428'],
        ]),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 80,
          bottom: 98,
          fontFamily: 'IBM Plex Mono',
          fontSize: 16,
          letterSpacing: 2.1,
          color: colors.accent,
        },
      },
      'SAME PICKS  /  SAME SCORE',
    ),
  );
}

function introCtaSlide(): ReactNode {
  return editorialFrame(
    wordmark(),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 80,
          right: 80,
          top: 300,
        },
      },
      eyebrow('Free to play'),
      headline('Make your call before the next session starts.', 94, 900),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: 118,
            marginTop: 86,
            padding: '0 38px',
            backgroundColor: colors.accent,
            color: colors.textOnAccent,
          },
        },
        e(
          'div',
          { style: { display: 'flex', fontSize: 31, fontWeight: 600 } },
          'Play Grand Prix Picks',
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'center',
            marginTop: 30,
            fontFamily: 'IBM Plex Mono',
            fontSize: 22,
            fontWeight: 600,
            color: colors.accent,
          },
        },
        'GrandPrixPicks.com/ig',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginTop: 46,
            paddingTop: 30,
            borderTop: `1px solid ${colors.borderStrong}`,
            fontFamily: 'IBM Plex Mono',
            fontSize: 17,
            letterSpacing: 2.1,
            color: colors.textMuted,
          },
        },
        e('div', {
          style: {
            width: 10,
            height: 10,
            marginRight: 14,
            borderRadius: 999,
            backgroundColor: colors.accent,
          },
        }),
        'PICKS LOCK AT SESSION START',
      ),
    ),
  );
}

type Slide = [filename: string, artwork: ReactNode];

const carousels: Array<[directory: string, slides: Slide[]]> = [
  [
    '01-what-is',
    [
      ['01-cover.png', introCoverSlide()],
      ['02-two-calls.png', introGameSlide()],
      ['03-two-tables.png', introPayoffSlide()],
      ['04-call-to-action.png', introCtaSlide()],
    ],
  ],
  [
    '02-how-scoring-works',
    [
      ['01-cover.png', scoringCoverSlide()],
      [
        '02-exact-position.png',
        scoringRuleSlide(
          '5',
          'Exact position',
          'Pick NOR for P1. NOR finishes P1.',
          colors.resultExact,
        ),
      ],
      [
        '03-one-position-away.png',
        scoringRuleSlide(
          '3',
          'One position away',
          'Pick LEC for P3. LEC finishes P2 or P4.',
          colors.resultNear,
        ),
      ],
      [
        '04-in-the-top-5.png',
        scoringRuleSlide(
          '1',
          'In the actual Top 5',
          'Pick PIA for P1. PIA finishes P4.',
          colors.resultTop5,
          'A P5 pick that finishes P6 still earns 3 points.',
        ),
      ],
      ['05-team-mate-call.png', h2hScoringSlide()],
      ['06-perfect-top-5.png', perfectTopFiveSlide()],
      ['07-picks-lock.png', scoringLockSlide()],
    ],
  ],
  [
    '03-global-private',
    [
      ['01-cover.png', competitionCoverSlide()],
      ['02-global-leaderboard.png', globalLeaderboardSlide()],
      ['03-private-leagues.png', privateLeagueSlide()],
      ['04-one-set-of-picks.png', oneSetOfPicksSlide()],
      ['05-every-session-counts.png', sessionsMoveOrderSlide()],
      ['06-call-to-action.png', competitionCtaSlide()],
    ],
  ],
];

async function main() {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );
  const fonts = await loadFonts();
  for (const [directory, slides] of carousels) {
    const outputDirectory = `${CAMPAIGN_OUTPUT_DIR}/${directory}`;
    await mkdir(outputDirectory, { recursive: true });

    for (const [filename, slide] of slides) {
      const svg = await satori(slide, { width: WIDTH, height: HEIGHT, fonts });
      const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
        .render()
        .asPng();
      const outputPath = `${outputDirectory}/${filename}`;
      await writeFile(outputPath, png);
      console.log('Wrote %s (%d x %d)', outputPath, WIDTH, HEIGHT);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
