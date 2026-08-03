import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

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

const execFileAsync = promisify(execFile);

const WIDTH = 1600;
const HEIGHT = 900;
const SEASON = 2026;
const CAMPAIGN_DATE = '2026-08-02';
const FIRST_POST_DATE = '2026-08-03';
const POST_TIME = '10:00';
const TIME_ZONE = 'Africa/Johannesburg';
const RESULTS_URL =
  'https://grandprixpicks.com/f1-teammate-battles?utm_source=social&utm_medium=organic&utm_campaign=summer_break_h2h_2026';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const backendDir = path.join(repoRoot, 'apps/backend');
const convexCli = path.join(backendDir, 'node_modules/.bin/convex');
const outputDir = path.join(
  repoRoot,
  'artifacts/social/summer-break-team-mate-h2h-2026',
);
const imageDir = path.join(outputDir, 'images');
const snapshotPath = path.join(outputDir, 'source.json');

const SESSION_TYPES = ['quali', 'sprint_quali', 'race', 'sprint'] as const;
type SessionType = (typeof SESSION_TYPES)[number];

type Driver = {
  code: string;
  displayName: string;
  number: number | null;
  nationality: string | null;
};

type Race = {
  _id: string;
  hasSprint: boolean;
  name: string;
  qualiStartAt: number;
  raceStartAt: number;
  round: number;
  season: number;
  slug: string;
  status: string;
};

type H2HResult = {
  team: string;
  winnerId: string;
  winnerCode: string;
  driver1: (Driver & { _id: string }) | null;
  driver2: (Driver & { _id: string }) | null;
};

type ProductionBattle = {
  team: string;
  drivers: Array<Driver & { driverId: string }>;
};

type ProductionBattles = {
  lastUpdated: number | null;
  teams: ProductionBattle[];
};

type Championship = {
  drivers: Array<{
    code: string;
    points: number;
  }>;
};

type DriverTally = Driver & {
  points: number;
  qualifying: number;
  sprintQualifying: number;
  race: number;
  sprint: number;
  total: number;
};

type QualifyingGap = {
  leaderCode: string;
  averageSeconds: number;
  sessions: number;
  method: 'deepest mutually completed qualifying phase';
  audit: Array<{
    raceSlug: string;
    sessionKey: number;
    phase: 'Q1' | 'Q2' | 'Q3';
    driver1Code: string;
    driver1Seconds: number;
    driver2Code: string;
    driver2Seconds: number;
    signedDriver1MinusDriver2Seconds: number;
  }>;
};

type TeamBattle = {
  team: string;
  sessionsSettled: number;
  drivers: [DriverTally, DriverTally];
  qualifyingGap: QualifyingGap | null;
};

type Snapshot = {
  generatedAt: string;
  season: number;
  throughRace: {
    name: string;
    round: number;
    slug: string;
  };
  lastUpdated: number;
  roundsCounted: number;
  sessionCounts: Record<SessionType, number>;
  teams: TeamBattle[];
};

type CampaignPost = {
  sequence: number;
  scheduledDate: string;
  scheduledTime: string;
  timeZone: string;
  team: string;
  image: string;
  altText: string;
  xCopy: string;
  xReply: string;
  redditTitle: string;
  redditBody: string;
};

type FlagData = Map<string, string>;

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

const teamPresentation: Record<string, { display: string; question: string }> =
  {
    Ferrari: {
      display: 'Ferrari',
      question: 'Who takes control when F1 returns?',
    },
    'Red Bull Racing': {
      display: 'Red Bull Racing',
      question: 'Can the gap close after the break?',
    },
    Audi: {
      display: 'Audi',
      question: 'Which driver would you back for the second half?',
    },
    McLaren: {
      display: 'McLaren',
      question: 'Can the second half swing the other way?',
    },
    Mercedes: {
      display: 'Mercedes',
      question: 'Who wins this battle over the full season?',
    },
    Williams: {
      display: 'Williams',
      question: 'Can the gap be turned around after the break?',
    },
    Cadillac: {
      display: 'Cadillac',
      question: 'Who has impressed you most in the new team?',
    },
    Haas: {
      display: 'Haas',
      question: 'Does the order stay the same after the break?',
    },
    'Racing Bulls': {
      display: 'Racing Bulls',
      question: 'Where do you expect this battle to finish?',
    },
    'Aston Martin': {
      display: 'Aston Martin',
      question: 'Can the second half change the picture?',
    },
    Alpine: {
      display: 'Alpine',
      question: 'Who would you pick when racing resumes?',
    },
  };

async function runConvexQuery<T>(name: string, args: object): Promise<T> {
  const { stdout } = await execFileAsync(
    convexCli,
    ['run', name, JSON.stringify(args), '--prod'],
    {
      cwd: backendDir,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout) as T;
}

type OpenF1Session = {
  session_key: number;
  date_start: string;
};

type OpenF1QualifyingResult = {
  driver_number: number;
  duration: Array<number | null>;
};

async function fetchOpenF1<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`https://api.openf1.org/v1/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
    });
    if (response.ok) {
      return (await response.json()) as T;
    }
    if (response.status !== 429 || attempt === 4) {
      throw new Error(`OpenF1 ${endpoint} failed with ${response.status}.`);
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter)
      ? Math.max(retryAfter * 1000, 500)
      : 750 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error(`OpenF1 ${endpoint} exhausted its retry budget.`);
}

function roundToMillis(value: number): number {
  return Math.round(value * 1000) / 1000;
}

async function fetchQualifyingGaps(
  races: Race[],
  battles: Iterable<TeamBattle>,
): Promise<Map<string, QualifyingGap>> {
  const sessions = await fetchOpenF1<OpenF1Session[]>('sessions', {
    year: String(SEASON),
    session_name: 'Qualifying',
  });
  const matchedSessions = races.map((race) => {
    const session = sessions.find(
      (candidate) =>
        Math.abs(
          new Date(candidate.date_start).getTime() - race.qualiStartAt,
        ) <=
        5 * 60 * 1000,
    );
    if (!session) {
      throw new Error(`OpenF1 has no qualifying session for ${race.slug}.`);
    }
    return { race, session };
  });
  const resultsBySession = new Map<
    number,
    { race: Race; rows: OpenF1QualifyingResult[] }
  >();
  for (const { race, session } of matchedSessions) {
    const rows = await fetchOpenF1<OpenF1QualifyingResult[]>('session_result', {
      session_key: String(session.session_key),
    });
    resultsBySession.set(session.session_key, { race, rows });
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const gaps = new Map<string, QualifyingGap>();
  for (const battle of battles) {
    const [driver1, driver2] = battle.drivers;
    if (driver1.number == null || driver2.number == null) {
      continue;
    }
    const audit: QualifyingGap['audit'] = [];

    for (const { race, session } of matchedSessions) {
      const result = resultsBySession.get(session.session_key);
      const row1 = result?.rows.find(
        (row) => row.driver_number === driver1.number,
      );
      const row2 = result?.rows.find(
        (row) => row.driver_number === driver2.number,
      );
      if (
        !row1 ||
        !row2 ||
        !Array.isArray(row1.duration) ||
        !Array.isArray(row2.duration)
      ) {
        continue;
      }

      let phaseIndex = -1;
      for (
        let index = 0;
        index < Math.min(row1.duration.length, row2.duration.length);
        index += 1
      ) {
        if (
          typeof row1.duration[index] === 'number' &&
          typeof row2.duration[index] === 'number'
        ) {
          phaseIndex = index;
        }
      }
      if (phaseIndex < 0 || phaseIndex > 2) {
        continue;
      }
      const driver1Seconds = row1.duration[phaseIndex];
      const driver2Seconds = row2.duration[phaseIndex];
      if (
        typeof driver1Seconds !== 'number' ||
        typeof driver2Seconds !== 'number'
      ) {
        continue;
      }
      audit.push({
        raceSlug: race.slug,
        sessionKey: session.session_key,
        phase: `Q${phaseIndex + 1}` as 'Q1' | 'Q2' | 'Q3',
        driver1Code: driver1.code,
        driver1Seconds,
        driver2Code: driver2.code,
        driver2Seconds,
        signedDriver1MinusDriver2Seconds: roundToMillis(
          driver1Seconds - driver2Seconds,
        ),
      });
    }

    if (audit.length === 0) {
      continue;
    }
    const signedAverage =
      audit.reduce(
        (sum, row) => sum + row.signedDriver1MinusDriver2Seconds,
        0,
      ) / audit.length;
    gaps.set(battle.team, {
      leaderCode: signedAverage <= 0 ? driver1.code : driver2.code,
      averageSeconds: roundToMillis(Math.abs(signedAverage)),
      sessions: audit.length,
      method: 'deepest mutually completed qualifying phase',
      audit,
    });
  }
  return gaps;
}

function emptyTally(driver: Driver, points: number): DriverTally {
  return {
    ...driver,
    points,
    qualifying: 0,
    sprintQualifying: 0,
    race: 0,
    sprint: 0,
    total: 0,
  };
}

function increment(tally: DriverTally, session: SessionType): void {
  if (session === 'quali') {
    tally.qualifying += 1;
  }
  if (session === 'sprint_quali') {
    tally.sprintQualifying += 1;
  }
  if (session === 'race') {
    tally.race += 1;
  }
  if (session === 'sprint') {
    tally.sprint += 1;
  }
  tally.total += 1;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const [races, production, championship] = await Promise.all([
    runConvexQuery<Race[]>('races:listRaces', { season: SEASON }),
    runConvexQuery<ProductionBattles>('h2h:getTeammateBattles', {
      season: SEASON,
    }),
    runConvexQuery<Championship>('f1Standings:getF1Championship', {
      season: SEASON,
    }),
  ]);

  if (!production.lastUpdated) {
    throw new Error('Production has no published team-mate results.');
  }

  const completedRaces = races
    .filter(
      (race) =>
        race.status === 'finished' &&
        race.raceStartAt <= production.lastUpdated!,
    )
    .sort((a, b) => a.round - b.round);
  const throughRace = completedRaces.at(-1);
  if (!throughRace) {
    throw new Error('No completed 2026 races found.');
  }

  const battlesByTeam = new Map<string, TeamBattle>();
  const pointsByCode = new Map(
    championship.drivers.map((driver) => [driver.code, driver.points]),
  );
  for (const battle of production.teams) {
    if (battle.drivers.length !== 2) {
      throw new Error(`${battle.team} does not have exactly two drivers.`);
    }
    battlesByTeam.set(battle.team, {
      team: battle.team,
      sessionsSettled: 0,
      qualifyingGap: null,
      drivers: [
        emptyTally(
          battle.drivers[0],
          pointsByCode.get(battle.drivers[0].code) ?? 0,
        ),
        emptyTally(
          battle.drivers[1],
          pointsByCode.get(battle.drivers[1].code) ?? 0,
        ),
      ],
    });
  }

  const sessionCounts: Record<SessionType, number> = {
    quali: 0,
    sprint_quali: 0,
    race: 0,
    sprint: 0,
  };

  const sessionJobs = completedRaces.flatMap((race) =>
    (race.hasSprint ? SESSION_TYPES : (['quali', 'race'] as const)).map(
      (session) => ({ race, session }),
    ),
  );

  const sessionResults = await Promise.all(
    sessionJobs.map(async ({ race, session }) => ({
      race,
      session,
      results: await runConvexQuery<H2HResult[] | null>(
        'h2h:getH2HResultsForRace',
        { raceId: race._id, sessionType: session },
      ),
    })),
  );

  for (const { race, session, results } of sessionResults) {
    if (!results?.length) {
      throw new Error(`Missing ${session} H2H results for ${race.slug}.`);
    }
    sessionCounts[session] += 1;

    for (const result of results) {
      const battle = battlesByTeam.get(result.team);
      if (!battle) {
        throw new Error(`Unknown team in result: ${result.team}`);
      }
      const winner = battle.drivers.find(
        (driver) => driver.code === result.winnerCode,
      );
      if (!winner) {
        throw new Error(
          `Unknown ${result.team} winner code: ${result.winnerCode}`,
        );
      }
      increment(winner, session);
      battle.sessionsSettled += 1;
    }
  }

  const qualifyingGaps = await fetchQualifyingGaps(
    completedRaces,
    battlesByTeam.values(),
  );
  for (const battle of battlesByTeam.values()) {
    battle.qualifyingGap = qualifyingGaps.get(battle.team) ?? null;
  }

  const orderedTeams = campaignOrder.map((team) => {
    const battle = battlesByTeam.get(team);
    if (!battle) {
      throw new Error(`Missing campaign team: ${team}`);
    }
    const [first, second] = battle.drivers;
    if (second.total > first.total) {
      battle.drivers = [second, first];
    }
    return battle;
  });

  return {
    generatedAt: new Date().toISOString(),
    season: SEASON,
    throughRace: {
      name: throughRace.name,
      round: throughRace.round,
      slug: throughRace.slug,
    },
    lastUpdated: production.lastUpdated,
    roundsCounted: completedRaces.length,
    sessionCounts,
    teams: orderedTeams,
  };
}

function teamColor(team: string): string {
  return teams[team as keyof typeof teams] ?? fallbackTeamColor;
}

function brandMark(size: number): ReactNode {
  return e(
    'svg',
    { width: size, height: size * (40 / 60), viewBox: '0 0 60 40' },
    e(
      'g',
      {
        fill: colors.accent,
        transform: 'translate(28 20) skewX(-12) translate(-28 -20)',
      },
      e('rect', { x: 7, y: 14, width: 12, height: 24 }),
      e('rect', { x: 24, y: 2, width: 12, height: 36 }),
      e('rect', { x: 41, y: 20, width: 12, height: 18 }),
    ),
  );
}

function textLabel(
  text: string,
  extra: Record<string, unknown> = {},
): ReactNode {
  return e(
    'div',
    {
      style: {
        fontSize: 19,
        fontWeight: 600,
        letterSpacing: 3.2,
        textTransform: 'uppercase' as const,
        color: colors.textMuted,
        ...extra,
      },
    },
    text,
  );
}

function driverBlock(
  driver: DriverTally,
  align: 'left' | 'right',
  flagSrc: string | undefined,
): ReactNode {
  const flag = flagSrc
    ? e('img', {
        src: flagSrc,
        width: 32,
        height: 24,
        alt: '',
        style: {
          width: 32,
          height: 24,
          objectFit: 'cover' as const,
          border: `1px solid ${colors.borderStrong}`,
        },
      })
    : null;
  const number = e(
    'div',
    {},
    driver.number == null ? 'NO NUMBER' : `#${driver.number}`,
  );

  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        width: 510,
      },
    },
    e(
      'div',
      {
        style: {
          fontFamily: 'IBM Plex Mono',
          fontSize: 112,
          lineHeight: 1,
          fontWeight: 600,
          letterSpacing: -5,
          color: colors.text,
        },
      },
      driver.code,
    ),
    e(
      'div',
      {
        style: {
          marginTop: 10,
          fontSize: 31,
          fontWeight: 400,
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
          gap: 10,
          marginTop: 10,
          fontFamily: 'IBM Plex Mono',
          fontSize: 19,
          color: colors.textMuted,
          letterSpacing: 1.5,
        },
      },
      ...(align === 'left' ? [flag, number] : [number, flag]),
    ),
  );
}

function breakdownRow(
  label: string,
  left: number,
  right: number,
  sprint: boolean,
  leftCode: string,
  rightCode: string,
): ReactNode {
  const margin = Math.abs(left - right);
  const marginLabel =
    margin === 0
      ? 'LEVEL'
      : `${left > right ? leftCode : rightCode} +${margin}`;

  function value(
    score: number,
    isLeading: boolean,
    side: 'left' | 'right',
  ): ReactNode {
    return e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
          width: 507,
          paddingLeft: side === 'left' ? 34 : 0,
          paddingRight: side === 'right' ? 34 : 0,
          fontFamily: 'IBM Plex Mono',
          fontSize: 34,
          fontWeight: 600,
          color: isLeading ? colors.text : colors.textMuted,
        },
      },
      String(score),
    );
  }

  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        minHeight: 56,
        borderTop: `1px solid ${colors.border}`,
      },
    },
    value(left, left >= right, 'left'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          width: 450,
          alignSelf: 'stretch',
          borderLeft: `1px solid ${colors.border}`,
          borderRight: `1px solid ${colors.border}`,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 2.2,
          textTransform: 'uppercase' as const,
          color: colors.textMuted,
        },
      },
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        sprint
          ? e('div', {
              style: { width: 3, height: 12, backgroundColor: colors.sprint },
            })
          : null,
        e('div', {}, label),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginTop: 6,
            fontFamily: 'IBM Plex Mono',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.8,
            color: colors.text,
          },
        },
        marginLabel,
      ),
    ),
    value(right, right >= left, 'right'),
  );
}

function breakdownMatrix(left: DriverTally, right: DriverTally): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        marginTop: 30,
        borderTop: `1px solid ${colors.border}`,
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
          minHeight: 42,
        },
      },
      textLabel(left.code, {
        display: 'flex',
        justifyContent: 'flex-start',
        width: 507,
        paddingLeft: 34,
        fontSize: 15,
        letterSpacing: 2.4,
        color: colors.text,
      }),
      textLabel('Session breakdown', {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        width: 450,
        borderLeft: `1px solid ${colors.border}`,
        borderRight: `1px solid ${colors.border}`,
        fontSize: 14,
        letterSpacing: 2,
      }),
      textLabel(right.code, {
        display: 'flex',
        justifyContent: 'flex-end',
        width: 507,
        paddingRight: 34,
        fontSize: 15,
        letterSpacing: 2.4,
        color: colors.text,
      }),
    ),
    breakdownRow('Races', left.race, right.race, false, left.code, right.code),
    breakdownRow(
      'Qualifying',
      left.qualifying,
      right.qualifying,
      false,
      left.code,
      right.code,
    ),
    breakdownRow(
      'Sprint races',
      left.sprint,
      right.sprint,
      true,
      left.code,
      right.code,
    ),
    breakdownRow(
      'Sprint qualifying',
      left.sprintQualifying,
      right.sprintQualifying,
      true,
      left.code,
      right.code,
    ),
  );
}

function overallSplitBar(
  left: DriverTally,
  right: DriverTally,
  color: string,
): ReactNode {
  const halfWidth = 126;
  const largestScore = Math.max(left.total, right.total, 1);
  const leftWidth = (left.total / largestScore) * halfWidth;
  const rightWidth = (right.total / largestScore) * halfWidth;
  const leftLeads = left.total > right.total;
  const rightLeads = right.total > left.total;
  const tied = !leftLeads && !rightLeads;

  function half(
    width: number,
    side: 'left' | 'right',
    leads: boolean,
  ): ReactNode {
    return e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
          width: halfWidth,
          height: 4,
          backgroundColor: colors.borderStrong,
        },
      },
      e('div', {
        style: {
          width,
          height: 4,
          backgroundColor: tied
            ? colors.text
            : leads
              ? color
              : colors.textMuted,
        },
      }),
    );
  }

  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
      },
    },
    half(leftWidth, 'left', leftLeads || !rightLeads),
    e('div', {
      style: {
        width: 3,
        height: 12,
        marginLeft: 7,
        marginRight: 7,
        backgroundColor: color,
      },
    }),
    half(rightWidth, 'right', rightLeads || !leftLeads),
  );
}

function championshipPointsLine(
  left: DriverTally,
  right: DriverTally,
): ReactNode {
  const leftLeads = left.points > right.points;
  const rightLeads = right.points > left.points;

  function points(value: number, leads: boolean, marginLeft = 0): ReactNode {
    return e(
      'div',
      {
        style: {
          fontWeight: leads ? 700 : 500,
          color: leads ? colors.text : colors.textMuted,
          marginLeft,
        },
      },
      String(value),
    );
  }

  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        marginTop: 8,
        fontFamily: 'IBM Plex Mono',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 1.4,
        textTransform: 'uppercase' as const,
        color: colors.textMuted,
      },
    },
    e('div', {}, 'CHAMPIONSHIP PTS ·'),
    e('div', { style: { marginLeft: 8 } }, left.code),
    points(left.points, leftLeads, 4),
    e('div', { style: { marginLeft: 2, marginRight: 2 } }, '–'),
    points(right.points, rightLeads),
    e('div', { style: { marginLeft: 4 } }, right.code),
  );
}

function editorialInsight(left: DriverTally, right: DriverTally): string {
  const disciplines = [
    { label: 'Races', left: left.race, right: right.race },
    {
      label: 'Qualifying',
      left: left.qualifying,
      right: right.qualifying,
    },
    { label: 'Sprint races', left: left.sprint, right: right.sprint },
    {
      label: 'Sprint qualifying',
      left: left.sprintQualifying,
      right: right.sprintQualifying,
    },
  ];
  const leftEdges = disciplines.filter(({ left: a, right: b }) => a > b);
  const rightEdges = disciplines.filter(({ left: a, right: b }) => b > a);
  const level = disciplines.filter(({ left: a, right: b }) => a === b);

  if (leftEdges.length === 2 && rightEdges.length === 2) {
    return 'Four disciplines. Two edges each.';
  }

  const leader =
    leftEdges.length > rightEdges.length
      ? left
      : rightEdges.length > 0
        ? right
        : null;
  const leadingEdges = Math.max(leftEdges.length, rightEdges.length);

  if (level.length === 1 && leader) {
    const levelLabel = level[0]?.label ?? 'One discipline';
    return leadingEdges === 3
      ? `${levelLabel} level. ${leader.code} leads the other three.`
      : `${levelLabel} level. ${leader.code} leads ${leadingEdges} of the other three.`;
  }

  if (leader && leadingEdges === 4) {
    return `${leader.code} leads every discipline.`;
  }
  if (leader) {
    return `${leader.code} leads ${leadingEdges} of four disciplines.`;
  }

  return 'Every discipline level.';
}

function card(
  snapshot: Snapshot,
  battle: TeamBattle,
  flags: FlagData,
): ReactNode {
  const [left, right] = battle.drivers;
  const presentation = teamPresentation[battle.team];
  const qualifyingContext = battle.qualifyingGap
    ? `AVG QUALI EDGE · ${battle.qualifyingGap.leaderCode} ${battle.qualifyingGap.averageSeconds.toFixed(3)}s`
    : 'AVG QUALI EDGE · UNAVAILABLE';

  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        width: WIDTH,
        height: HEIGHT,
        padding: '54px 68px 42px',
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: 'Archivo',
        position: 'relative' as const,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 14 } },
        brandMark(31),
        textLabel('Grand Prix Picks', { color: colors.text, fontSize: 18 }),
      ),
      textLabel('2026 Summer Break · Team-mate H2H', { fontSize: 17 }),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 54,
        },
      },
      e('div', {
        style: {
          width: 3,
          height: 54,
          backgroundColor: teamColor(battle.team),
        },
      }),
      e(
        'div',
        {
          style: {
            fontSize: 53,
            fontWeight: 300,
            letterSpacing: -1.2,
            lineHeight: 1,
          },
        },
        presentation.display,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 48,
        },
      },
      driverBlock(
        left,
        'left',
        left.nationality ? flags.get(left.nationality) : undefined,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            width: 390,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'baseline',
              fontFamily: 'IBM Plex Mono',
              fontSize: 101,
              lineHeight: 1,
              fontWeight: 600,
              letterSpacing: -7,
              color: colors.text,
            },
          },
          e('div', {}, String(left.total)),
          e('div', { style: { color: teamColor(battle.team) } }, '–'),
          e('div', {}, String(right.total)),
        ),
        overallSplitBar(left, right, teamColor(battle.team)),
        textLabel(qualifyingContext, {
          marginTop: 12,
          fontSize: 13,
          letterSpacing: 1.6,
        }),
        championshipPointsLine(left, right),
      ),
      driverBlock(
        right,
        'right',
        right.nationality ? flags.get(right.nationality) : undefined,
      ),
    ),
    breakdownMatrix(left, right),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          marginTop: 24,
        },
      },
      e('div', {
        style: {
          width: 3,
          height: 22,
          backgroundColor: teamColor(battle.team),
        },
      }),
      e(
        'div',
        {
          style: {
            fontSize: 19,
            fontWeight: 400,
            letterSpacing: 0.2,
            color: colors.textMuted,
          },
        },
        editorialInsight(left, right),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: 26,
          borderTop: `1px solid ${colors.border}`,
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
            letterSpacing: 1.2,
            color: colors.textMuted,
          },
        },
        `THROUGH HUNGARIAN GP · ${snapshot.roundsCounted} ROUNDS · ${snapshot.sessionCounts.sprint} SPRINT WEEKENDS`,
      ),
      e(
        'div',
        {
          style: {
            fontFamily: 'IBM Plex Mono',
            fontSize: 16,
            color: colors.textMuted,
          },
        },
        'METHODOLOGY · grandprixpicks.com/results-policy',
      ),
    ),
  );
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function pairScore(battle: TeamBattle, field: keyof DriverTally): string {
  return `${battle.drivers[0][field]}–${battle.drivers[1][field]}`;
}

function qualifyingLeaderSurname(battle: TeamBattle): string {
  const leader = battle.drivers.find(
    (driver) => driver.code === battle.qualifyingGap?.leaderCode,
  );
  return (
    leader?.displayName.split(' ').at(-1) ??
    battle.qualifyingGap?.leaderCode ??
    'Unavailable'
  );
}

function xCopyForTeam(battle: TeamBattle): string {
  const [left, right] = battle.drivers;
  const overall = `${left.total}–${right.total}`;

  switch (battle.team) {
    case 'Ferrari':
      return `Ferrari could not be closer at the summer break.\n\n${left.displayName} and ${right.displayName} are level at ${overall}. ${left.displayName.split(' ').at(-1)} leads qualifying and sprint races. ${right.displayName.split(' ').at(-1)} leads races and sprint qualifying.\n\nWho do you expect to finish the season ahead?`;
    case 'Red Bull Racing':
      return `Verstappen has set the pace on the Red Bull side of the garage.\n\n${left.displayName} leads ${right.displayName} ${overall} and is ahead in all four disciplines.\n\nWhere does Hadjar need to make up the most ground after the break?`;
    case 'Audi':
      return `The Audi score tells two different stories.\n\n${left.displayName} leads ${right.displayName} ${overall} overall, but ${qualifyingLeaderSurname(battle)} leads qualifying ${pairScore(battle, 'qualifying').split('–').reverse().join('–')} and holds a ${battle.qualifyingGap?.averageSeconds.toFixed(3)}s average qualifying edge.\n\nWhose first half has impressed you more?`;
    case 'McLaren':
      return `McLaren are level on Sundays, but not overall.\n\n${left.displayName} leads ${right.displayName} ${overall}, with a ${pairScore(battle, 'qualifying')} qualifying advantage and a clean sweep of all eight sprint sessions.\n\nCan Piastri turn it around after the break?`;
    case 'Mercedes':
      return `The Mercedes battle is split by format.\n\n${left.displayName} leads ${right.displayName} ${overall} overall, ${pairScore(battle, 'race')} in races and ${pairScore(battle, 'qualifying')} in qualifying. Russell leads sprint races ${pairScore(battle, 'sprint').split('–').reverse().join('–')}.\n\nWho finishes the season ahead?`;
    case 'Williams':
      return `The Williams total looks one-sided. The race score does not.\n\n${left.displayName} leads ${right.displayName} ${overall} overall, but only ${pairScore(battle, 'race')} in races. Most of the gap has come from qualifying and the sprint sessions.\n\nWhat do you make of the split?`;
    case 'Cadillac':
      return `Cadillac’s first summer-break team-mate score is in.\n\n${left.displayName} leads ${right.displayName} ${overall} overall, although ${qualifyingLeaderSurname(battle)} holds a tiny ${battle.qualifyingGap?.averageSeconds.toFixed(3)}s average qualifying edge.\n\nWhich side of that split matters more?`;
    case 'Haas':
      return `Bearman has taken control of the Haas battle.\n\n${left.displayName} leads ${right.displayName} ${overall} overall. Sprint races are the only discipline still level.\n\nCan Ocon close the gap after the break?`;
    case 'Racing Bulls':
      return `The Racing Bulls are much closer over one lap than the total suggests.\n\n${left.displayName} leads ${right.displayName} ${overall} overall, but qualifying is only ${pairScore(battle, 'qualifying')}. The larger gap has come on race days.\n\nWhere do you see this finishing?`;
    case 'Aston Martin':
      return `Alonso has swept every part of the Aston Martin battle.\n\n${left.displayName} leads ${right.displayName} ${overall}, including ${pairScore(battle, 'qualifying')} in qualifying and ${pairScore(battle, 'sprintQualifying')} in sprint qualifying.\n\nCan Stroll take a discipline back after the break?`;
    case 'Alpine':
      return `Alpine’s overall score is exactly two to one.\n\n${left.displayName} leads ${right.displayName} ${overall}. Sprint qualifying is the only discipline still level.\n\nCan Colapinto close the gap in the second half?`;
    default:
      throw new Error(`Missing X copy for ${battle.team}.`);
  }
}

function redditCopyForTeam(battle: TeamBattle): {
  title: string;
  opening: string;
  question: string;
} {
  const [left, right] = battle.drivers;
  const overall = `${left.total}-${right.total}`;

  switch (battle.team) {
    case 'Ferrari':
      return {
        title: `${left.displayName} and ${right.displayName} are tied ${overall} at the summer break`,
        opening: `${left.displayName} leads qualifying 6-5 and sprint races 3-1. ${right.displayName} leads races 6-5 and sprint qualifying 3-1, while also holding a 31-point championship advantage. Same total, very different routes to it.`,
        question:
          'Which tells you more about their first half: the 15-15 H2H or the championship points gap?',
      };
    case 'Red Bull Racing':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall} in Red Bull's summer-break H2H`,
        opening: `${left.displayName} leads all four categories and has swept the eight sprint sessions. ${right.displayName}'s six H2H wins have all come in races and qualifying, where the score is 8-3 in each.`,
        question:
          'What would a successful second half of this matchup look like for Hadjar?',
      };
    case 'Audi':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall}, but Audi's qualifying picture is different`,
        opening: `${left.displayName} has the stronger race record and a 10-2 points lead. ${right.displayName}, however, leads qualifying 6-5 and holds a 0.395s average qualifying edge. The count says one thing; the size of the gaps says another.`,
        question:
          "Which first half would you rather have: Bortoleto's race and points record, or Hülkenberg's one-lap pace?",
      };
    case 'McLaren':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall} despite McLaren being tied 5-5 in races`,
        opening: `The Sunday score is level, but ${left.displayName} leads qualifying 7-4 and swept all eight sprint sessions. One of the 30 possible H2H outcomes was void under the methodology, leaving 29 classified outcomes in the overall total.`,
        question:
          'Does the 5-5 race score make this matchup closer than the 20-9 total suggests?',
      };
    case 'Mercedes':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall} at the summer break`,
        opening: `${left.displayName} has built the lead in races and qualifying, winning both categories 7-4. ${right.displayName} leads sprint races 3-1, while sprint qualifying is tied 2-2.`,
        question:
          "Is Antonelli's race and qualifying edge more meaningful than Russell's advantage in sprint races?",
      };
    case 'Williams':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall}, but their race H2H is only 6-5`,
        opening: `${left.displayName}'s overall lead has been built largely through a 9-2 qualifying score and an 8-0 sweep of the sprint sessions. On Sundays, ${right.displayName} is only one result behind.`,
        question:
          'Does the 6-5 race score describe this pairing better than the 23-7 overall total?',
      };
    case 'Cadillac':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall} in Cadillac's first summer-break H2H`,
        opening: `${left.displayName} leads the qualifying count 6-5, yet ${right.displayName} holds the average qualifying edge by 0.016s. Neither driver has scored a championship point, so the internal comparison is doing almost all the work here.`,
        question:
          "Does Bottas's 0.016s average edge change how you read Pérez's 6-5 qualifying lead?",
      };
    case 'Haas':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall} at the summer break`,
        opening: `${left.displayName} leads races 7-4, qualifying 8-3 and sprint qualifying 3-1. Sprint races are the one category ${right.displayName} has kept level at 2-2.`,
        question: 'If Ocon is going to make this close, where does it start?',
      };
    case 'Racing Bulls':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall}, with qualifying much closer`,
        opening: `${left.displayName}'s largest advantage is the 8-3 race score. Qualifying is only 6-5 and sprint qualifying is tied 2-2, so the one-lap picture is considerably closer than the overall total.`,
        question:
          'Does that one-lap closeness suggest Lindblad can narrow the overall gap after the break?',
      };
    case 'Aston Martin':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall} and every Aston Martin H2H category`,
        opening: `${left.displayName} leads every category, including qualifying 9-2 and sprint qualifying 4-0. The internal H2H is emphatic even though the championship points are only 1-0.`,
        question:
          'Which category gives Stroll the most realistic chance of taking ground back?',
      };
    case 'Alpine':
      return {
        title: `${left.displayName} leads ${right.displayName} ${overall} at the summer break`,
        opening: `${left.displayName} leads races 7-4, qualifying 8-3 and sprint races 3-1. Sprint qualifying is the only level category at 2-2, while the championship points stand at 42-19.`,
        question:
          'Is the 2-2 sprint-qualifying score a foothold for Colapinto, or just the outlier?',
      };
    default:
      throw new Error(`Missing Reddit copy for ${battle.team}.`);
  }
}

function buildPost(battle: TeamBattle, sequence: number): CampaignPost {
  const [left, right] = battle.drivers;
  const presentation = teamPresentation[battle.team];
  const image = `images/${String(sequence).padStart(2, '0')}-${slugify(battle.team)}.png`;
  const xCopy = xCopyForTeam(battle);
  const xReply = `Full methodology and every 2026 team-mate battle:\n\n${RESULTS_URL}`;
  const comparison =
    left.total === right.total
      ? `${left.displayName} and ${right.displayName} are level at ${left.total} each`
      : `${left.displayName} leads ${right.displayName} ${left.total} to ${right.total}`;
  const qualifyingContext = battle.qualifyingGap
    ? ` Average qualifying edge: ${battle.qualifyingGap.leaderCode} by ${battle.qualifyingGap.averageSeconds.toFixed(3)} seconds.`
    : '';
  const altText = `Grand Prix Picks summer-break graphic for ${presentation.display}, with nationality flags for both drivers. ${comparison} across classified sessions. Races ${pairScore(battle, 'race')}, qualifying ${pairScore(battle, 'qualifying')}, sprint races ${pairScore(battle, 'sprint')}, and sprint qualifying ${pairScore(battle, 'sprintQualifying')}.${qualifyingContext} Championship points: ${left.code} ${left.points} to ${right.points} ${right.code}.`;
  const redditCopy = redditCopyForTeam(battle);
  const qualifyingLeader = battle.drivers.find(
    (driver) => driver.code === battle.qualifyingGap?.leaderCode,
  );
  const redditTitle = redditCopy.title;
  const redditBody = `${redditCopy.opening}\n\n**The breakdown through the Hungarian GP**\n\n- Races: **${left.displayName} ${left.race}-${right.race} ${right.displayName}**\n- Qualifying: **${left.displayName} ${left.qualifying}-${right.qualifying} ${right.displayName}**\n- Sprint races: **${left.displayName} ${left.sprint}-${right.sprint} ${right.displayName}**\n- Sprint qualifying: **${left.displayName} ${left.sprintQualifying}-${right.sprintQualifying} ${right.displayName}**\n- Overall: **${left.displayName} ${left.total}-${right.total} ${right.displayName}** (${battle.sessionsSettled} classified outcomes)\n- Average qualifying edge: **${battle.qualifyingGap && qualifyingLeader ? `${qualifyingLeader.displayName} by ${battle.qualifyingGap.averageSeconds.toFixed(3)}s` : 'Unavailable'}**\n- Championship points: **${left.displayName} ${left.points}-${right.points} ${right.displayName}**\n\nEach race, qualifying session, sprint race and sprint qualifying session counts as one H2H result, using the official classification. Retirements and disqualifications still count; a session where neither driver started is void. Qualifying gaps compare the deepest phase both drivers completed.\n\n${redditCopy.question}\n\n[Methodology and the full 2026 grid](${RESULTS_URL})`;

  const xLength = xCharacterCount(xCopy);
  if (xLength > 280) {
    throw new Error(`${battle.team} X copy is ${xLength} X characters.`);
  }
  if (redditTitle.length > 300) {
    throw new Error(`${battle.team} Reddit title is over 300 characters.`);
  }
  if (redditTitle.includes('—') || redditBody.includes('—')) {
    throw new Error(`${battle.team} Reddit copy contains an em dash.`);
  }

  return {
    sequence,
    scheduledDate: addDays(FIRST_POST_DATE, sequence - 1),
    scheduledTime: POST_TIME,
    timeZone: TIME_ZONE,
    team: battle.team,
    image,
    altText,
    xCopy,
    xReply,
    redditTitle,
    redditBody,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** X wraps every URL with t.co, where it consumes 23 characters. */
function xCharacterCount(value: string): number {
  return value.replaceAll(/https?:\/\/\S+/g, 'x'.repeat(23)).length;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function campaignCsv(posts: CampaignPost[]): string {
  const header = [
    'sequence',
    'scheduled_date',
    'scheduled_time',
    'timezone',
    'team',
    'image_path',
    'x_copy',
    'x_reply',
    'alt_text',
    'reddit_title',
    'reddit_body',
  ];
  const rows = posts.map((post) => [
    post.sequence,
    post.scheduledDate,
    post.scheduledTime,
    post.timeZone,
    post.team,
    post.image,
    post.xCopy,
    post.xReply,
    post.altText,
    post.redditTitle,
    post.redditBody,
  ]);
  return [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')
    .concat('\n');
}

function campaignMarkdown(snapshot: Snapshot, posts: CampaignPost[]): string {
  const sections = posts.map(
    (post) =>
      `## ${String(post.sequence).padStart(2, '0')} · ${post.team} · ${post.scheduledDate}\n\nImage: [${post.image}](${post.image})\n\n### X\n\n${post.xCopy}\n\nFirst reply:\n\n${post.xReply}\n\nAlt text:\n\n> ${post.altText}\n\n### Reddit\n\nTitle: ${post.redditTitle}\n\n${post.redditBody}`,
  );
  return `# 2026 summer-break team-mate H2H campaign\n\n11 standalone team posts for X and Reddit. Results are frozen through the ${snapshot.throughRace.name} (round ${snapshot.throughRace.round}) and were last updated ${new Date(snapshot.lastUpdated).toISOString()}.\n\nThe schedule is a draft: one post per day at ${POST_TIME} ${TIME_ZONE}. X rows are structured for later Buffer automation. Reddit rows are a manual posting checklist; check each target community's self-promotion and title rules before posting.\n\n${sections.join('\n\n---\n\n')}\n`;
}

async function loadFlags(snapshot: Snapshot): Promise<FlagData> {
  const nationalities = new Set(
    snapshot.teams.flatMap((battle) =>
      battle.drivers.flatMap((driver) =>
        driver.nationality ? [driver.nationality] : [],
      ),
    ),
  );
  const entries = await Promise.all(
    [...nationalities].map(async (nationality) => {
      const svg = await readFile(
        path.join(
          repoRoot,
          'apps/web/public/flags',
          `${nationality.toLowerCase()}.svg`,
        ),
      );
      return [
        nationality,
        `data:image/svg+xml;base64,${svg.toString('base64')}`,
      ] as const;
    }),
  );
  return new Map(entries);
}

async function render(
  snapshot: Snapshot,
  requestedTeam: string | undefined,
): Promise<number> {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );
  const fonts = await loadFonts();
  const flags = await loadFlags(snapshot);
  const posts = snapshot.teams.map((battle, index) =>
    buildPost(battle, index + 1),
  );
  const battlesToRender = requestedTeam
    ? snapshot.teams.filter(
        (battle) => battle.team.toLowerCase() === requestedTeam.toLowerCase(),
      )
    : snapshot.teams;

  if (battlesToRender.length === 0) {
    throw new Error(`No campaign team named "${requestedTeam}".`);
  }

  for (const battle of battlesToRender) {
    const index = snapshot.teams.indexOf(battle);
    const post = posts[index];
    const svg = await satori(card(snapshot, battle, flags), {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    });
    const png = new Resvg(svg, {
      fitTo: { mode: 'width', value: WIDTH },
    })
      .render()
      .asPng();
    await writeFile(path.join(outputDir, post.image), png);
  }

  if (!requestedTeam) {
    await Promise.all([
      writeFile(
        path.join(outputDir, 'manifest.json'),
        `${JSON.stringify({ campaignDate: CAMPAIGN_DATE, posts }, null, 2)}\n`,
      ),
      writeFile(path.join(outputDir, 'campaign.csv'), campaignCsv(posts)),
      writeFile(
        path.join(outputDir, 'copy.md'),
        campaignMarkdown(snapshot, posts),
      ),
    ]);
  }

  return battlesToRender.length;
}

async function main() {
  await mkdir(imageDir, { recursive: true });
  const refresh = process.argv.includes('--refresh');
  const requestedTeam = process.argv
    .find((arg) => arg.startsWith('--team='))
    ?.slice('--team='.length);
  let snapshot: Snapshot;

  if (refresh) {
    snapshot = await fetchSnapshot();
    await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  } else {
    try {
      snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot;
    } catch {
      snapshot = await fetchSnapshot();
      await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    }
  }

  if (snapshot.teams.length !== 11) {
    throw new Error(
      `Expected 11 team match-ups, received ${snapshot.teams.length}.`,
    );
  }

  const renderedCount = await render(snapshot, requestedTeam);
  console.log(
    requestedTeam
      ? `Wrote ${requestedTeam} preview to ${outputDir}`
      : `Wrote ${renderedCount} campaign images and copy to ${outputDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
