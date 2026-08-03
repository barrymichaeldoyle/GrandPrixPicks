import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  colors,
  fallbackTeamColor,
  teams,
} from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';

const FEED_WIDTH = 1080;
const FEED_HEIGHT = 1350;
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const FEED_GUTTER = 80;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const sourcePath = path.join(
  repoRoot,
  'artifacts/social/summer-break-team-mate-h2h-2026/source.json',
);
const outputDir = path.join(
  repoRoot,
  'artifacts/social/instagram-h2h-2026/images',
);
const previewDir = path.join(outputDir, 'previews');

type Driver = {
  code: string;
  displayName: string;
  nationality: string | null;
  number: number | null;
  points: number;
  qualifying: number;
  race: number;
  sprint: number;
  sprintQualifying: number;
  total: number;
};

type Battle = {
  team: string;
  sessionsSettled: number;
  qualifyingGap: {
    leaderCode: string;
    averageSeconds: number;
  } | null;
  drivers: [Driver, Driver];
};

type Snapshot = {
  season: number;
  throughRace: { name: string; round: number };
  teams: Battle[];
};

type Insight = {
  headline: string[];
  body: string[];
};

const campaignOrder = [
  'Ferrari',
  'Red Bull Racing',
  'Audi',
  'McLaren',
  'Mercedes',
  'Williams',
  'Cadillac',
  'Haas',
  'Racing Bulls',
  'Aston Martin',
  'Alpine',
] as const;

const contextTeams = [
  'Ferrari',
  'Audi',
  'McLaren',
  'Mercedes',
  'Williams',
  'Cadillac',
  'Racing Bulls',
] as const;

const controlTeams = [
  'Red Bull Racing',
  'Haas',
  'Aston Martin',
  'Alpine',
] as const;

const storyTeams = [
  'Ferrari',
  'McLaren',
  'Audi',
  'Williams',
  'Red Bull Racing',
  'Mercedes',
  'Cadillac',
  'Haas',
  'Racing Bulls',
  'Aston Martin',
  'Alpine',
] as const;

const contextInsights: Record<(typeof contextTeams)[number], Insight> = {
  Ferrari: {
    headline: ['Level overall. Split by format.'],
    body: [
      'Leclerc leads qualifying and sprint races.',
      'Hamilton leads races and sprint qualifying.',
    ],
  },
  Audi: {
    headline: ['Bortoleto leads the count.', 'Hülkenberg leads qualifying.'],
    body: [
      'Hülkenberg is 0.395s quicker on average',
      'across 11 qualifying sessions.',
    ],
  },
  McLaren: {
    headline: ['20-9 overall.', 'Races are tied 5-5.'],
    body: [
      'Norris built the rest of the gap',
      'in qualifying and the sprint sessions.',
    ],
  },
  Mercedes: {
    headline: ['Antonelli leads overall.', 'Russell owns sprint races.'],
    body: [
      'Antonelli’s advantage comes from',
      'races and qualifying, both 7-4.',
    ],
  },
  Williams: {
    headline: ['23-7 overall.', 'Only 6-5 on Sundays.'],
    body: [
      'Sainz built the gap in qualifying',
      'and swept all eight sprint sessions.',
    ],
  },
  Cadillac: {
    headline: ['Pérez leads the count.', 'Bottas has the one-lap edge.'],
    body: [
      'Bottas is 0.016s quicker on average',
      'despite trailing qualifying 6-5.',
    ],
  },
  'Racing Bulls': {
    headline: ['19-11 overall.', 'Qualifying is only 6-5.'],
    body: [
      'Lawson built the larger advantage',
      'on race days, not over one lap.',
    ],
  },
};

const controlInsights: Record<(typeof controlTeams)[number], Insight> = {
  'Red Bull Racing': {
    headline: ['Verstappen leads every format.'],
    body: [
      'He leads races and qualifying 8-3, with a clean sweep of all eight sprint sessions.',
    ],
  },
  Haas: {
    headline: ['Bearman leads three of four formats.'],
    body: [
      'Sprint races are tied. Bearman leads races, qualifying and sprint qualifying.',
    ],
  },
  'Aston Martin': {
    headline: ['Alonso leads every format.'],
    body: [
      'The largest gap is qualifying at 9-2, followed by a 4-0 sprint qualifying sweep.',
    ],
  },
  Alpine: {
    headline: ['Gasly leads three of four formats.'],
    body: [
      'Sprint qualifying is tied. Gasly leads races, qualifying and sprint races.',
    ],
  },
};

function teamColor(team: string): string {
  return teams[team as keyof typeof teams] ?? fallbackTeamColor;
}

function flagSource(nationality: string | null): string | null {
  if (!nationality) return null;
  try {
    return `data:image/svg+xml;base64,${readFileSync(
      path.join(
        repoRoot,
        'apps/web/public/flags',
        `${nationality.toLowerCase()}.svg`,
      ),
    ).toString('base64')}`;
  } catch {
    return null;
  }
}

function mark(scale = 1): ReactNode {
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
    ...[46, 72, 38].map((height, index) =>
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

function canvas(width: number, height: number, ...children: ReactNode[]) {
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

function feedBrandRail(section: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'absolute',
        left: FEED_GUTTER,
        right: FEED_GUTTER,
        top: 62,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'IBM Plex Mono',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: 2.8,
          color: colors.textMuted,
        },
      },
      'GRAND PRIX PICKS',
      e('div', {
        style: {
          width: 34,
          height: 1,
          margin: '0 16px',
          backgroundColor: colors.borderStrong,
        },
      }),
      e(
        'div',
        { style: { display: 'flex', color: colors.textDisabled } },
        section,
      ),
    ),
    mark(0.58),
  );
}

function feedFooter(text = '2026 SUMMER BREAK H2H'): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'absolute',
        left: FEED_GUTTER,
        right: FEED_GUTTER,
        bottom: 62,
        paddingTop: 20,
        borderTop: `1px solid ${colors.borderStrong}`,
        fontFamily: 'IBM Plex Mono',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: 1.8,
        color: colors.textMuted,
      },
    },
    e('div', { style: { display: 'flex' } }, text),
    e(
      'div',
      { style: { display: 'flex', color: colors.accent } },
      'GrandPrixPicks.com/ig',
    ),
  );
}

function eyebrow(text: string, size = 19): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize: size,
        fontWeight: 600,
        letterSpacing: 3,
        color: colors.textMuted,
        textTransform: 'uppercase',
      },
    },
    text,
  );
}

function flag(driver: Driver, width = 34): ReactNode {
  const source = flagSource(driver.nationality);
  return source
    ? e('img', {
        src: source,
        width,
        height: Math.round(width * 0.67),
        style: {
          objectFit: 'cover',
          border: `1px solid ${colors.borderStrong}`,
        },
      })
    : '';
}

function scoreLeader(left: Driver, right: Driver): 'left' | 'right' | 'tie' {
  if (left.total === right.total) return 'tie';
  return left.total > right.total ? 'left' : 'right';
}

function compactScoreCard(battle: Battle): ReactNode {
  const [left, right] = battle.drivers;
  const leader = scoreLeader(left, right);
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: 448,
        height: 94,
        padding: '14px 16px 13px 20px',
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.surface,
      },
    },
    e('div', {
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        backgroundColor: teamColor(battle.team),
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1.4,
          color: colors.textMuted,
          textTransform: 'uppercase',
        },
      },
      battle.team,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          marginTop: 8,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            width: 138,
          },
        },
        flag(left, 25),
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginLeft: 9,
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
              color: colors.textMuted,
            },
          },
          `#${left.number ?? '?'} ${left.code}`,
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'flex-end',
            width: 48,
            fontFamily: 'IBM Plex Mono',
            fontSize: 25,
            fontWeight: 600,
            color: leader === 'right' ? colors.text : colors.accent,
          },
        },
        left.total,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'center',
            width: 28,
            fontFamily: 'IBM Plex Mono',
            color: colors.textDisabled,
          },
        },
        ':',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'flex-start',
            width: 48,
            fontFamily: 'IBM Plex Mono',
            fontSize: 25,
            fontWeight: 600,
            color: leader === 'left' ? colors.text : colors.accent,
          },
        },
        right.total,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: 150,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              marginRight: 9,
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
              color: colors.textMuted,
            },
          },
          `#${right.number ?? '?'} ${right.code}`,
        ),
        flag(right, 25),
      ),
    ),
  );
}

function fullGridScorecard(snapshot: Snapshot): ReactNode {
  const constructorOrder = [...snapshot.teams].sort((left, right) => {
    const leftPoints = left.drivers.reduce(
      (total, driver) => total + driver.points,
      0,
    );
    const rightPoints = right.drivers.reduce(
      (total, driver) => total + driver.points,
      0,
    );
    return rightPoints - leftPoints;
  });

  return canvas(
    FEED_WIDTH,
    FEED_HEIGHT,
    feedBrandRail('TEAM-MATE H2H'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: FEED_GUTTER,
          top: 180,
          width: 900,
        },
      },
      eyebrow(`${snapshot.season} F1 summer break`),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 24,
            fontSize: 78,
            fontWeight: 300,
            letterSpacing: -2.1,
            lineHeight: 1.04,
          },
        },
        'Every team-mate battle.',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 24,
            fontSize: 26,
            color: colors.textMuted,
          },
        },
        `Through the ${snapshot.throughRace.name}.`,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          position: 'absolute',
          left: FEED_GUTTER,
          right: FEED_GUTTER,
          top: 485,
          gap: 14,
        },
      },
      ...constructorOrder.map((battle) => compactScoreCard(battle)),
    ),
    feedFooter('RACE  /  QUALIFYING  /  SPRINT  /  SPRINT QUALI'),
  );
}

function driverHeading(driver: Driver, align: 'left' | 'right'): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        width: 360,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: 72,
          fontWeight: 600,
          lineHeight: 1,
        },
      },
      driver.code,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          flexDirection: align === 'left' ? 'row' : 'row-reverse',
          marginTop: 12,
        },
      },
      flag(driver, 32),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginLeft: align === 'left' ? 12 : 0,
            marginRight: align === 'right' ? 12 : 0,
            fontSize: 18,
            color: colors.textMuted,
          },
        },
        `${driver.displayName}  #${driver.number ?? '?'}`,
      ),
    ),
  );
}

function categoryRow(
  label: string,
  leftScore: number,
  rightScore: number,
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        height: 70,
        borderTop: `1px solid ${colors.border}`,
        fontFamily: 'IBM Plex Mono',
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'center',
          width: 150,
          fontSize: 28,
          fontWeight: 600,
          color: leftScore > rightScore ? colors.accent : colors.textMuted,
        },
      },
      leftScore,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'center',
          flex: 1,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 1.6,
          color: colors.textMuted,
        },
      },
      label,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'center',
          width: 150,
          fontSize: 28,
          fontWeight: 600,
          color: rightScore > leftScore ? colors.accent : colors.textMuted,
        },
      },
      rightScore,
    ),
  );
}

function battleBreakdown(battle: Battle): ReactNode {
  const [left, right] = battle.drivers;
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
    categoryRow('RACES', left.race, right.race),
    categoryRow('QUALIFYING', left.qualifying, right.qualifying),
    categoryRow('SPRINT RACES', left.sprint, right.sprint),
    categoryRow(
      'SPRINT QUALIFYING',
      left.sprintQualifying,
      right.sprintQualifying,
    ),
  );
}

function teamDetailSlide(
  battle: Battle,
  section: string,
  insight: Insight,
): ReactNode {
  const [left, right] = battle.drivers;
  const leader = scoreLeader(left, right);
  return canvas(
    FEED_WIDTH,
    FEED_HEIGHT,
    feedBrandRail(section),
    e('div', {
      style: {
        position: 'absolute',
        left: 0,
        top: 148,
        width: 7,
        height: 920,
        backgroundColor: teamColor(battle.team),
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: FEED_GUTTER,
          top: 176,
        },
      },
      eyebrow(battle.team),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          position: 'absolute',
          left: FEED_GUTTER,
          right: FEED_GUTTER,
          top: 246,
        },
      },
      driverHeading(left, 'left'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            width: 240,
            paddingBottom: 18,
            fontFamily: 'IBM Plex Mono',
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 88,
              fontWeight: 600,
              lineHeight: 1,
              color: leader === 'right' ? colors.text : colors.accent,
            },
          },
          left.total,
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              margin: '0 12px',
              fontSize: 34,
              color: colors.textDisabled,
            },
          },
          ':',
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 88,
              fontWeight: 600,
              lineHeight: 1,
              color: leader === 'left' ? colors.text : colors.accent,
            },
          },
          right.total,
        ),
      ),
      driverHeading(right, 'right'),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: FEED_GUTTER,
          right: FEED_GUTTER,
          top: 440,
        },
      },
      battleBreakdown(battle),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: FEED_GUTTER,
          right: FEED_GUTTER,
          top: 790,
          padding: '34px 36px',
          border: `1px solid ${colors.borderStrong}`,
          backgroundColor: colors.page,
          minHeight: 228,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            fontSize: 39,
            fontWeight: 600,
            lineHeight: 1.15,
          },
        },
        ...insight.headline.map((line) =>
          e('div', { key: line, style: { display: 'flex' } }, line),
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: 830,
            marginTop: 18,
            fontSize: 23,
            lineHeight: 1.4,
            color: colors.textMuted,
          },
        },
        ...insight.body.map((line) =>
          e('div', { key: line, style: { display: 'flex' } }, line),
        ),
      ),
    ),
    feedFooter(`${battle.sessionsSettled} CLASSIFIED OUTCOMES`),
  );
}

function contextCover(): ReactNode {
  const teasers = [
    {
      team: 'McLaren',
      overall: '20-9',
      contrastLabel: 'RACE SCORE',
      contrast: '5-5',
    },
    {
      team: 'Williams',
      overall: '23-7',
      contrastLabel: 'RACE SCORE',
      contrast: '6-5',
    },
    {
      team: 'Cadillac',
      overall: '20-10',
      contrastLabel: 'QUALIFYING PACE',
      contrast: 'BOT 0.016s QUICKER',
    },
  ];
  return canvas(
    FEED_WIDTH,
    FEED_HEIGHT,
    feedBrandRail('TEAM-MATE H2H'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: FEED_GUTTER,
          top: 205,
          width: 900,
        },
      },
      eyebrow('Seven battles worth a closer look'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 28,
            fontSize: 86,
            fontWeight: 300,
            letterSpacing: -2.5,
            lineHeight: 1.03,
          },
        },
        e('div', { style: { display: 'flex' } }, 'The score does not'),
        e(
          'div',
          { style: { display: 'flex', color: colors.accent } },
          'tell the whole story.',
        ),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: FEED_GUTTER,
          right: FEED_GUTTER,
          top: 560,
          gap: 14,
        },
      },
      ...teasers.map((teaser) =>
        e(
          'div',
          {
            key: teaser.team,
            style: {
              display: 'flex',
              flexDirection: 'column',
              height: 142,
              padding: '20px 28px',
              border: `1px solid ${colors.borderStrong}`,
              backgroundColor: colors.surface,
              fontFamily: 'IBM Plex Mono',
            },
          },
          e(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: 1.8,
                color: colors.textMuted,
                textTransform: 'uppercase',
              },
            },
            e('div', {
              style: {
                width: 7,
                height: 20,
                marginRight: 12,
                backgroundColor: teamColor(teaser.team),
              },
            }),
            teaser.team,
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'flex-end',
                marginTop: 14,
              },
            },
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  width: 390,
                },
              },
              e(
                'div',
                {
                  style: {
                    display: 'flex',
                    fontSize: 11,
                    letterSpacing: 1.5,
                    color: colors.textMuted,
                  },
                },
                'OVERALL SCORE',
              ),
              e(
                'div',
                {
                  style: {
                    display: 'flex',
                    marginTop: 2,
                    fontSize: 31,
                    color: colors.text,
                  },
                },
                teaser.overall,
              ),
            ),
            e('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 1,
                height: 50,
                margin: '0 38px',
                backgroundColor: colors.borderStrong,
              },
            }),
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  alignItems: 'flex-end',
                },
              },
              e(
                'div',
                {
                  style: {
                    display: 'flex',
                    fontSize: 11,
                    letterSpacing: 1.5,
                    color: colors.textMuted,
                  },
                },
                teaser.contrastLabel,
              ),
              e(
                'div',
                {
                  style: {
                    display: 'flex',
                    marginTop: 2,
                    fontSize: teaser.team === 'Cadillac' ? 24 : 31,
                    fontWeight: 600,
                    color: colors.accent,
                  },
                },
                teaser.contrast,
              ),
            ),
          ),
        ),
      ),
    ),
    feedFooter('SWIPE FOR THE FORMAT-BY-FORMAT BREAKDOWN'),
  );
}

function controlCover(battles: Battle[]): ReactNode {
  return canvas(
    FEED_WIDTH,
    FEED_HEIGHT,
    feedBrandRail('TEAM-MATE H2H'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: FEED_GUTTER,
          top: 190,
          width: 900,
        },
      },
      eyebrow('The clearest internal leads'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 28,
            fontSize: 88,
            fontWeight: 300,
            letterSpacing: -2.5,
            lineHeight: 1.03,
          },
        },
        e('div', { style: { display: 'flex' } }, 'Four drivers have'),
        e(
          'div',
          { style: { display: 'flex', color: colors.accent } },
          'taken control.',
        ),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: FEED_GUTTER,
          right: FEED_GUTTER,
          top: 560,
          gap: 14,
        },
      },
      ...battles.map((battle) => {
        const [left, right] = battle.drivers;
        const leader = left.total >= right.total ? left : right;
        const trailing = leader === left ? right : left;
        return e(
          'div',
          {
            key: battle.team,
            style: {
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              height: 122,
              padding: '0 26px 0 34px',
              border: `1px solid ${colors.borderStrong}`,
              backgroundColor: colors.surface,
            },
          },
          e('div', {
            style: {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              backgroundColor: teamColor(battle.team),
            },
          }),
          flag(leader, 36),
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
              {
                style: {
                  display: 'flex',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 13,
                  letterSpacing: 1.6,
                  color: colors.textMuted,
                },
              },
              battle.team.toUpperCase(),
            ),
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  marginTop: 8,
                  fontSize: 27,
                  fontWeight: 600,
                },
              },
              leader.displayName,
            ),
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'baseline',
                fontFamily: 'IBM Plex Mono',
              },
            },
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: 48,
                  fontWeight: 600,
                  color: colors.accent,
                },
              },
              leader.total,
            ),
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  margin: '0 10px',
                  fontSize: 22,
                  color: colors.textDisabled,
                },
              },
              ':',
            ),
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: 34,
                  color: colors.textMuted,
                },
              },
              trailing.total,
            ),
          ),
        );
      }),
    ),
    feedFooter('SWIPE FOR THE FORMAT-BY-FORMAT BREAKDOWN'),
  );
}

function questionSlide(
  eyebrowText: string,
  headline: string,
  body: string,
): ReactNode {
  return canvas(
    FEED_WIDTH,
    FEED_HEIGHT,
    feedBrandRail('YOUR CALL'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: FEED_GUTTER,
          right: FEED_GUTTER,
          top: 290,
        },
      },
      eyebrow(eyebrowText),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 34,
            fontSize: 92,
            fontWeight: 300,
            letterSpacing: -2.6,
            lineHeight: 1.05,
          },
        },
        headline,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            width: 820,
            marginTop: 44,
            fontSize: 30,
            lineHeight: 1.45,
            color: colors.textMuted,
          },
        },
        body,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginTop: 78,
            paddingTop: 30,
            borderTop: `1px solid ${colors.borderStrong}`,
            fontFamily: 'IBM Plex Mono',
            fontSize: 17,
            letterSpacing: 2,
            color: colors.accent,
          },
        },
        'TEAM-MATE CALLS COUNT IN EVERY SESSION',
      ),
    ),
    feedFooter('FREE F1 PREDICTION GAME'),
  );
}

function storyDriverCard(driver: Driver, selectedColour: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        height: 380,
        padding: '44px 22px 30px',
        border: `1px solid ${colors.borderStrong}`,
        borderBottom: `7px solid ${selectedColour}`,
        backgroundColor: colors.surface,
      },
    },
    flag(driver, 58),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 28,
          fontFamily: 'IBM Plex Mono',
          fontSize: 72,
          fontWeight: 600,
          lineHeight: 1,
        },
      },
      driver.code,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 18,
          fontSize: 23,
          fontWeight: 600,
          textAlign: 'center',
        },
      },
      driver.displayName,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 10,
          fontFamily: 'IBM Plex Mono',
          fontSize: 15,
          color: colors.textMuted,
        },
      },
      `#${driver.number ?? '?'}  /  SCORE ${driver.total}`,
    ),
  );
}

function storyPollBackground(battle: Battle): ReactNode {
  const [left, right] = battle.drivers;
  const colour = teamColor(battle.team);
  return canvas(
    STORY_WIDTH,
    STORY_HEIGHT,
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          left: 74,
          right: 74,
          top: 92,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: 2.7,
            color: colors.textMuted,
          },
        },
        'GRAND PRIX PICKS',
      ),
      mark(0.58),
    ),
    e('div', {
      style: {
        position: 'absolute',
        left: 0,
        top: 172,
        width: 8,
        height: 1160,
        backgroundColor: colour,
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 74,
          right: 74,
          top: 230,
        },
      },
      eyebrow(battle.team, 18),
      e(
        'div',
        {
          style: {
            display: 'flex',
            width: 900,
            marginTop: 30,
            fontSize: 72,
            fontWeight: 300,
            letterSpacing: -1.9,
            lineHeight: 1.05,
          },
        },
        'Who finishes 2026 ahead?',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 74,
          right: 74,
          top: 520,
          gap: 18,
        },
      },
      storyDriverCard(left, colour),
      storyDriverCard(right, colour),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: 74,
          right: 74,
          top: 950,
        },
      },
      battleBreakdown(battle),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          left: 74,
          right: 74,
          bottom: 88,
          paddingTop: 22,
          borderTop: `1px solid ${colors.borderStrong}`,
          fontFamily: 'IBM Plex Mono',
          fontSize: 15,
          letterSpacing: 1.8,
          color: colors.textMuted,
        },
      },
      e(
        'div',
        { style: { display: 'flex' } },
        'CURRENT SCORE  /  SUMMER BREAK',
      ),
      e(
        'div',
        { style: { display: 'flex', color: colors.accent } },
        'GrandPrixPicks.com/ig',
      ),
    ),
  );
}

async function renderPng(
  artwork: ReactNode,
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const svg = await satori(artwork, {
    width,
    height,
    fonts: await loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();
  await writeFile(outputPath, png);
}

async function contactSheet(
  title: string,
  files: string[],
  outputPath: string,
  aspect: 'feed' | 'story',
): Promise<void> {
  const columns = aspect === 'feed' ? 3 : 4;
  const thumbWidth = aspect === 'feed' ? 270 : 190;
  const thumbHeight = aspect === 'feed' ? 338 : 338;
  const cellHeight = thumbHeight + 46;
  const rows = Math.ceil(files.length / columns);
  const width = 1120;
  const height = 112 + rows * cellHeight + 40;
  const images = await Promise.all(
    files.map(async (file) => ({
      file,
      source: `data:image/png;base64,${(await readFile(file)).toString('base64')}`,
    })),
  );
  const artwork = e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        padding: '36px 44px',
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: 'Archivo',
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
          letterSpacing: 2.2,
          color: colors.textMuted,
        },
      },
      title,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px 28px',
          marginTop: 28,
        },
      },
      ...images.map(({ file, source }, index) =>
        e(
          'div',
          {
            key: file,
            style: {
              display: 'flex',
              flexDirection: 'column',
              width: thumbWidth,
            },
          },
          e('img', {
            src: source,
            width: thumbWidth,
            height: thumbHeight,
            style: {
              objectFit: 'cover',
              border: `1px solid ${colors.borderStrong}`,
            },
          }),
          e(
            'div',
            {
              style: {
                display: 'flex',
                marginTop: 10,
                fontFamily: 'IBM Plex Mono',
                fontSize: 12,
                color: colors.textMuted,
              },
            },
            `${String(index + 1).padStart(2, '0')}  ${path.basename(file)}`,
          ),
        ),
      ),
    ),
  );
  await renderPng(artwork, width, height, outputPath);
}

function battleMap(snapshot: Snapshot): Map<string, Battle> {
  return new Map(snapshot.teams.map((battle) => [battle.team, battle]));
}

async function renderCollection(
  directory: string,
  slides: Array<[string, ReactNode]>,
): Promise<string[]> {
  const directoryPath = path.join(outputDir, directory);
  await mkdir(directoryPath, { recursive: true });
  const files: string[] = [];
  for (const [filename, artwork] of slides) {
    const outputPath = path.join(directoryPath, filename);
    await renderPng(artwork, FEED_WIDTH, FEED_HEIGHT, outputPath);
    files.push(outputPath);
  }
  return files;
}

async function main(): Promise<void> {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );
  await mkdir(previewDir, { recursive: true });
  const snapshot = JSON.parse(await readFile(sourcePath, 'utf8')) as Snapshot;
  const byTeam = battleMap(snapshot);
  snapshot.teams = campaignOrder.map((team) => byTeam.get(team)!);

  const scorecardFiles = await renderCollection('01-full-grid-scorecard', [
    ['01-scorecard.png', fullGridScorecard(snapshot)],
  ]);

  const contextFiles = await renderCollection('02-score-needs-context', [
    ['01-cover.png', contextCover()],
    ...contextTeams.map(
      (team, index) =>
        [
          `${String(index + 2).padStart(2, '0')}-${team.toLowerCase().replaceAll(' ', '-')}.png`,
          teamDetailSlide(
            byTeam.get(team)!,
            'THE TOTAL NEEDS CONTEXT',
            contextInsights[team],
          ),
        ] as [string, ReactNode],
    ),
    [
      '09-your-call.png',
      questionSlide(
        'Second-half prediction',
        'Which battle changes most after the break?',
        'Save this scorecard. We will run every team-mate battle again at the end of the season.',
      ),
    ],
  ]);

  const controlBattles = controlTeams.map((team) => byTeam.get(team)!);
  const controlFiles = await renderCollection('03-drivers-in-control', [
    ['01-cover.png', controlCover(controlBattles)],
    ...controlTeams.map(
      (team, index) =>
        [
          `${String(index + 2).padStart(2, '0')}-${team.toLowerCase().replaceAll(' ', '-')}.png`,
          teamDetailSlide(
            byTeam.get(team)!,
            'DRIVERS IN CONTROL',
            controlInsights[team],
          ),
        ] as [string, ReactNode],
    ),
    [
      '06-your-call.png',
      questionSlide(
        'Second-half prediction',
        'Which gap is most likely to close?',
        'Four clear leads at the summer break. The next run starts with a clean session score.',
      ),
    ],
  ]);

  const storyOutputDir = path.join(outputDir, 'stories');
  await mkdir(storyOutputDir, { recursive: true });
  const storyFiles: string[] = [];
  for (const [index, team] of storyTeams.entries()) {
    const filename = `${String(index + 1).padStart(2, '0')}-${team.toLowerCase().replaceAll(' ', '-')}.png`;
    const outputPath = path.join(storyOutputDir, filename);
    await renderPng(
      storyPollBackground(byTeam.get(team)!),
      STORY_WIDTH,
      STORY_HEIGHT,
      outputPath,
    );
    storyFiles.push(outputPath);
  }

  await contactSheet(
    'FULL-GRID SCORECARD',
    scorecardFiles,
    path.join(previewDir, '01-full-grid-scorecard.png'),
    'feed',
  );
  await contactSheet(
    'THE SCORE NEEDS CONTEXT',
    contextFiles,
    path.join(previewDir, '02-score-needs-context.png'),
    'feed',
  );
  await contactSheet(
    'DRIVERS IN CONTROL',
    controlFiles,
    path.join(previewDir, '03-drivers-in-control.png'),
    'feed',
  );
  await contactSheet(
    'STORY POLLS',
    storyFiles,
    path.join(previewDir, '04-story-polls.png'),
    'story',
  );

  console.log(`Wrote Instagram H2H content to ${outputDir}`);
}

await main();
