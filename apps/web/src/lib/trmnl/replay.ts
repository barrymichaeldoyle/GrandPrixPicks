import type { TrmnlInput } from './payload';
import { isBetweenRounds, selectTrmnlRace } from './payload';
import type { TrmnlWeekendData } from './weekendData';

type Race = NonNullable<TrmnlInput['race']>;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * The moments of a weekend the `/trmnl` page shows, each defined against the
 * race's own schedule so any weekend can be replayed at it.
 */
export type TrmnlMomentId =
  | 'between'
  | 'build-up'
  | 'friday'
  | 'saturday'
  | 'race-morning'
  | 'finished'
  | 'sprint';

export const TRMNL_MOMENTS: readonly { id: TrmnlMomentId; label: string }[] = [
  { id: 'between', label: 'Between rounds' },
  { id: 'build-up', label: 'Build-up' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'race-morning', label: 'Race morning' },
  { id: 'finished', label: 'Finished' },
  { id: 'sprint', label: 'Sprint weekend' },
];

function weekendStart(race: Race): number {
  return Math.min(
    ...[
      race.fp1StartAt,
      race.sprintQualiStartAt,
      race.qualiStartAt,
      race.raceStartAt,
    ].filter((at): at is number => at !== undefined),
  );
}

/**
 * When a moment happens on a given weekend, or null if that weekend has no
 * such moment (the sprint, on a regular weekend).
 *
 * Between rounds is nine days before the weekend, past the six-day line
 * (`isBetweenRounds`); `pickReplay` skips a weekend with no gap before it.
 *
 * Friday evening is three hours after the last Friday session starts: FP2 on
 * a regular weekend, sprint qualifying on a sprint one. Saturday is three
 * hours after qualifying, the sprint moment three hours after the sprint.
 */
export function momentAt(race: Race, moment: TrmnlMomentId): number | null {
  switch (moment) {
    case 'between':
      return weekendStart(race) - 9 * DAY_MS;
    case 'build-up':
      return weekendStart(race) - 3 * DAY_MS;
    case 'friday': {
      const friday = race.hasSprint
        ? race.sprintQualiStartAt
        : (race.fp2StartAt ?? race.fp1StartAt);
      return friday === undefined ? null : friday + 3 * HOUR_MS;
    }
    case 'saturday':
      return race.qualiStartAt === undefined
        ? null
        : race.qualiStartAt + 3 * HOUR_MS;
    case 'race-morning':
      return race.raceStartAt - 4 * HOUR_MS;
    case 'finished':
      return race.raceStartAt + 4 * HOUR_MS;
    case 'sprint':
      return race.hasSprint && race.sprintStartAt !== undefined
        ? race.sprintStartAt + 3 * HOUR_MS
        : null;
  }
}

/**
 * Which weekend shows a moment, and when.
 *
 * The next race if the moment has already come for it, otherwise the latest
 * past weekend it has come for: so on a Tuesday the build-up is this weekend's,
 * live, and Friday is last weekend's until this Friday evening arrives. The
 * build-up of a weekend that has not started is shown at the real time rather
 * than three days before, because now is the build-up; more than six days out,
 * now is between rounds instead, and the build-up tab replays the last one.
 *
 * `races` is the season, in any order. Null when no weekend in it has reached
 * the moment yet, e.g. every moment but the build-up before round one.
 */
export function pickReplay(
  races: readonly Race[],
  moment: TrmnlMomentId,
  now: number,
): { race: Race; at: number; live: boolean } | null {
  const live = races
    .filter((race) => race.status !== 'cancelled')
    .sort((a, b) => b.raceStartAt - a.raceStartAt);
  const next = [...live].reverse().find((race) => race.raceStartAt > now);

  // Now is the next weekend's build-up, or the gap before it, whichever it
  // is: each tab shows its own phase, so the other falls back to a replay.
  if (
    next &&
    now < weekendStart(next) &&
    (moment === 'build-up' || moment === 'between') &&
    (moment === 'between') === isBetweenRounds(next, now) &&
    selectTrmnlRace(live, now) === next
  ) {
    return { race: next, at: now, live: true };
  }
  for (const race of live) {
    const at = momentAt(race, moment);
    // Between rounds only follows a gap: after a back-to-back, the previous
    // race still holds the screen nine days out.
    if (
      at !== null &&
      at <= now &&
      (moment !== 'between' || selectTrmnlRace(live, at) === race)
    ) {
      return { race, at, live: false };
    }
  }
  return null;
}

/** How long after a session starts its result is taken to be published. */
const RESULT_LAG_MS: Record<keyof TrmnlWeekendData['results'], number> = {
  sprint_quali: 1.5 * HOUR_MS,
  sprint: 1.5 * HOUR_MS,
  quali: 1.5 * HOUR_MS,
  race: 2.5 * HOUR_MS,
};
const PRACTICE_LAG_MS = 1.5 * HOUR_MS;

const SESSION_START: Record<keyof TrmnlWeekendData['results'], keyof Race> = {
  sprint_quali: 'sprintQualiStartAt',
  sprint: 'sprintStartAt',
  quali: 'qualiStartAt',
  race: 'raceStartAt',
};

const PRACTICE_START = {
  fp1: 'fp1StartAt',
  fp2: 'fp2StartAt',
  fp3: 'fp3StartAt',
} as const;

/**
 * A weekend as it stood at `at`: only the results, practice and news that had
 * been published by then. A finished weekend replayed at Friday evening must
 * not show Sunday's podium, and the starting grid, which arrives as a news
 * item, must not appear before it was announced.
 *
 * Results carry no publish time of their own here, so a session's result is
 * taken to land a fixed lag after it starts. News uses its real publish time.
 */
export function replayWeekend(
  data: TrmnlWeekendData,
  at: number,
): Omit<TrmnlInput, 'now' | 'timeZone' | 'locale'> {
  const { race } = data;
  const results: TrmnlWeekendData['results'] = {};
  for (const [session, rows] of Object.entries(data.results) as [
    keyof TrmnlWeekendData['results'],
    TrmnlWeekendData['results'][keyof TrmnlWeekendData['results']],
  ][]) {
    const startAt = race[SESSION_START[session]] as number | undefined;
    if (
      rows &&
      startAt !== undefined &&
      startAt + RESULT_LAG_MS[session] <= at
    ) {
      results[session] = rows;
    }
  }
  return {
    race,
    results,
    practice: data.practice.filter((summary) => {
      const startAt = race[PRACTICE_START[summary.sessionType]];
      return startAt !== undefined && startAt + PRACTICE_LAG_MS <= at;
    }),
    news: data.news.filter((item) => item.publishedAt <= at),
    weather: data.weather,
    // Today's table, so only while this weekend has scored no points: after
    // that it counts results the replayed moment had not seen.
    standings: data.results.race || data.results.sprint ? null : data.standings,
  };
}
