import { localDateKey } from '@/lib/weatherPresentation';

import type { TrmnlInput, TrmnlPayload } from './payload';
import { buildTrmnlPayload } from './payload';

/**
 * Sample weekends for the TRMNL plugin, run through the real payload builder.
 *
 * These drive the `/trmnl` page and the render tests, so a screen shown on the
 * site is always the screen the endpoint would produce for that moment: change
 * the builder or a Liquid layout and every scenario changes with it.
 *
 * The data is illustrative and the page says so. Results are invented, and
 * news is invented, so nothing here reads as a report of what happened at a
 * real race.
 */
export type TrmnlScenario = {
  id: string;
  label: string;
  /** What moment of the weekend this is, for the page caption. */
  moment: string;
  /** What the payload was built from, so the page can vary its news. */
  input: TrmnlInput;
  payload: TrmnlPayload;
};

function at(iso: string): number {
  return Date.parse(iso);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const monza: NonNullable<TrmnlInput['race']> = {
  _id: 'sample-monza' as NonNullable<TrmnlInput['race']>['_id'],
  slug: 'italy-2026',
  name: 'Italian Grand Prix',
  round: 16,
  season: 2026,
  status: 'upcoming',
  hasSprint: false,
  fp1StartAt: at('2026-09-04T11:30:00Z'),
  fp2StartAt: at('2026-09-04T15:00:00Z'),
  fp3StartAt: at('2026-09-05T10:30:00Z'),
  sprintQualiStartAt: undefined,
  sprintQualiLockAt: undefined,
  sprintStartAt: undefined,
  sprintLockAt: undefined,
  qualiStartAt: at('2026-09-05T14:00:00Z'),
  qualiLockAt: at('2026-09-05T14:00:00Z'),
  raceStartAt: at('2026-09-06T13:00:00Z'),
  predictionLockAt: at('2026-09-06T13:00:00Z'),
};

const miami: NonNullable<TrmnlInput['race']> = {
  _id: 'sample-miami' as NonNullable<TrmnlInput['race']>['_id'],
  slug: 'miami-2026',
  name: 'Miami Grand Prix',
  round: 6,
  season: 2026,
  status: 'upcoming',
  hasSprint: true,
  fp1StartAt: at('2026-05-01T16:30:00Z'),
  fp2StartAt: undefined,
  fp3StartAt: undefined,
  sprintQualiStartAt: at('2026-05-01T20:30:00Z'),
  sprintQualiLockAt: at('2026-05-01T20:30:00Z'),
  sprintStartAt: at('2026-05-02T16:00:00Z'),
  sprintLockAt: at('2026-05-02T16:00:00Z'),
  qualiStartAt: at('2026-05-02T20:00:00Z'),
  qualiLockAt: at('2026-05-02T20:00:00Z'),
  raceStartAt: at('2026-05-03T20:00:00Z'),
  predictionLockAt: at('2026-05-03T20:00:00Z'),
};

const GRID_ORDER = [
  ['NOR', 'Lando Norris'],
  ['PIA', 'Oscar Piastri'],
  ['LEC', 'Charles Leclerc'],
  ['VER', 'Max Verstappen'],
  ['RUS', 'George Russell'],
  ['HAM', 'Lewis Hamilton'],
  ['ANT', 'Kimi Antonelli'],
  ['ALB', 'Alexander Albon'],
  ['SAI', 'Carlos Sainz'],
  ['ALO', 'Fernando Alonso'],
  ['STR', 'Lance Stroll'],
  ['GAS', 'Pierre Gasly'],
  ['COL', 'Franco Colapinto'],
  ['OCO', 'Esteban Ocon'],
  ['BEA', 'Oliver Bearman'],
  ['HUL', 'Nico Hulkenberg'],
  ['BOR', 'Gabriel Bortoleto'],
  ['LAW', 'Liam Lawson'],
  ['HAD', 'Isack Hadjar'],
  ['LIN', 'Arvid Lindblad'],
  ['BOT', 'Valtteri Bottas'],
  ['PER', 'Sergio Perez'],
] as const;

const classification = GRID_ORDER.map(([code, displayName], index) => ({
  position: index + 1,
  code,
  displayName,
}));

const practice = (['fp1', 'fp2', 'fp3'] as const).map((sessionType, i) => ({
  sessionType,
  topThree: classification.slice(i, i + 3),
}));

/*
 * Invented headlines for the sample screens.
 */
const news: TrmnlInput['news'] = [
  {
    headline: 'Five-place grid penalty for a gearbox change',
    publishedAt: at('2026-09-05T18:00:00Z'),
  },
  {
    headline: 'Rain forecast for qualifying',
    publishedAt: at('2026-09-04T09:00:00Z'),
  },
  {
    headline: 'New floor for the home race',
    publishedAt: at('2026-09-03T09:00:00Z'),
  },
];

/**
 * Invented headlines for the `/trmnl` page's news switch, which shows any
 * moment with 0, 1, 2 or 20 of them instead of the news as published.
 */
const SAMPLE_HEADLINES = [
  'A late gearbox change puts a front runner under investigation',
  'Teams bring revised floors and rear wings for the weekend',
  'A weather shift could change qualifying conditions',
  'The stewards review an impeding incident from final practice',
  'Two drivers receive new power unit parts before the weekend',
  'A revised tyre selection changes the long-run picture',
  'A team confirms its line-up for next season',
  'Track limits at the final corner will be monitored closely',
  'A reserve driver takes over a car in first practice',
  'The pit lane speed limit is lowered for safety',
  'Teams expect a close fight through the final sector',
  'Pirelli selects its hardest compounds for the weekend',
  'A late setup change improves balance over one lap',
  'Race control adds a warning for unsafe releases',
  'The championship leader loses time in second practice',
  'A new power unit enters service for the weekend',
  'Drivers ask for more grip at the final chicane',
  'The team changes its cooling package for qualifying',
  'A safety car could shape Sunday’s tyre strategy',
  'The stewards review a pit lane incident after practice',
];

/** The headline counts the news switch offers. */
export const TRMNL_NEWS_COUNTS = [0, 1, 2, 20] as const;
export type TrmnlNewsCount = (typeof TRMNL_NEWS_COUNTS)[number];

/**
 * What a screen shows with `count` sample headlines in place of its news: the
 * headlines, and the block the large layouts give their spare room to, since
 * news can change it.
 *
 * The starting grid arrives as a news item, so an item carrying one is kept
 * (race morning keeps its grid) but its headline is not counted. The samples
 * are published in the half hours before the moment, so they are its newest
 * news. The payload carries at most twenty headlines, so twenty shows all
 * candidates, as it would on a device.
 */
export function sampleNewsVariant(
  input: TrmnlInput,
  count: TrmnlNewsCount,
): Pick<TrmnlPayload, 'news' | 'focus'> {
  const grids = input.news.filter(
    (item) => (item.startingGrid?.length ?? 0) > 0,
  );
  const samples = SAMPLE_HEADLINES.slice(0, count).map((headline, index) => ({
    headline,
    publishedAt: input.now - (index + 1) * 30 * 60 * 1000,
  }));
  // The focus sees the grid too; the headlines are the samples alone, so the
  // grid's own headline never takes one of the payload's twenty places.
  return {
    focus: buildTrmnlPayload({ ...input, news: [...grids, ...samples] }).focus,
    news: buildTrmnlPayload({ ...input, news: samples }).news,
  };
}

const gridNews: TrmnlInput['news'][number] = {
  headline: 'Starting grid confirmed',
  publishedAt: at('2026-09-06T09:00:00Z'),
  startingGrid: classification.map((row) =>
    row.code === 'ANT' ? { ...row, note: '5-place penalty' } : row,
  ),
};

/**
 * An invented final season, for the off-season sample. The points are made
 * up; the order follows the sample grid.
 */
const DRIVER_POINTS = [
  412, 389, 331, 318, 290, 244, 231, 142, 128, 97, 88, 77, 69, 61, 54, 46, 38,
  31, 24, 18, 12, 7,
];
const sampleStandings: NonNullable<TrmnlInput['standings']> = {
  season: 2026,
  roundsScored: 23,
  roundsTotal: 23,
  drivers: classification.slice(0, DRIVER_POINTS.length).map((row, index) => ({
    ...row,
    points: DRIVER_POINTS[index]!,
  })),
  constructors: (
    [
      ['McLaren', 801],
      ['Ferrari', 575],
      ['Mercedes', 521],
      ['Red Bull Racing', 402],
      ['Williams', 225],
      ['Aston Martin', 118],
      ['Alpine', 74],
      ['Haas', 61],
      ['Racing Bulls', 58],
      ['Audi', 40],
      ['Cadillac', 12],
    ] as const
  ).map(([team, points], index) => ({ position: index + 1, team, points })),
};

/**
 * Off-season news, a winter's worth ahead of when it could be real, so it is
 * invented and says so.
 */
export const SAMPLE_OFF_SEASON_NEWS: TrmnlInput['news'] = [
  {
    headline: 'Pre-season testing dates confirmed',
    publishedAt: at('2026-12-18T10:00:00Z'),
  },
  {
    headline: 'Team reveals launch date for its new car',
    publishedAt: at('2026-12-15T10:00:00Z'),
  },
  {
    headline: 'Sporting regulations updated for next season',
    publishedAt: at('2026-12-11T10:00:00Z'),
  },
];

type SampleDay = {
  temperatureC: number;
  conditionCode: string;
  precipitationProbability: number;
};

/**
 * An hourly forecast in MET Norway's shape, one condition per local day, so
 * each session reads the same per-session window the race pages use.
 */
export function sampleForecast(
  timeZone: string,
  days: Record<string, SampleDay>,
): NonNullable<TrmnlInput['weather']> {
  const dates = Object.keys(days).sort();
  const start = Date.parse(`${dates[0]}T00:00:00Z`) - DAY_MS;
  const end = Date.parse(`${dates.at(-1)}T00:00:00Z`) + 2 * DAY_MS;
  const hours = [];
  for (let at = start; at < end; at += HOUR_MS) {
    const localDate = localDateKey(at, timeZone);
    const day = days[localDate];
    if (!day) {
      continue;
    }
    hours.push({
      at,
      localDate,
      localHour: Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone,
          hour: '2-digit',
          hourCycle: 'h23',
        }).format(at),
      ),
      forecastPeriodHours: 1,
      temperatureC: day.temperatureC,
      conditionCode: day.conditionCode,
      precipitationAmountMm: day.precipitationProbability >= 50 ? 1.2 : 0,
      precipitationProbability: day.precipitationProbability,
      windSpeedMps: 3,
    });
  }
  return {
    isStale: false,
    forecast: {
      raceSlug: 'sample',
      timeZone,
      provider: 'met_no',
      providerUpdatedAt: start,
      fetchedAt: start,
      expiresAt: end,
      checkedAt: start,
      eventDates: dates,
      hours,
      days: [],
    },
  };
}

const weather = sampleForecast('Europe/Rome', {
  '2026-09-04': {
    temperatureC: 26,
    conditionCode: 'fair_day',
    precipitationProbability: 5,
  },
  '2026-09-05': {
    temperatureC: 23,
    conditionCode: 'rain',
    precipitationProbability: 60,
  },
  '2026-09-06': {
    temperatureC: 27,
    conditionCode: 'partlycloudy_day',
    precipitationProbability: 10,
  },
});

const miamiWeather = sampleForecast('America/New_York', {
  '2026-05-01': {
    temperatureC: 29,
    conditionCode: 'partlycloudy_day',
    precipitationProbability: 15,
  },
  '2026-05-02': {
    temperatureC: 30,
    conditionCode: 'rainshowersandthunder_day',
    precipitationProbability: 45,
  },
  '2026-05-03': {
    temperatureC: 31,
    conditionCode: 'clearsky_day',
    precipitationProbability: 0,
  },
});

const base: Omit<TrmnlInput, 'now'> = {
  timeZone: 'Europe/London',
  locale: 'en-GB',
  race: monza,
  news: [],
  results: {},
  practice: [],
  weather,
};

function scenario(
  id: string,
  label: string,
  moment: string,
  input: Partial<TrmnlInput> & { now: number },
): TrmnlScenario {
  const full: TrmnlInput = { ...base, ...input };
  return { id, label, moment, input: full, payload: buildTrmnlPayload(full) };
}

export const TRMNL_SCENARIOS: readonly TrmnlScenario[] = [
  scenario('build-up', 'Build-up', 'Tuesday before the weekend', {
    now: at('2026-09-01T09:00:00Z'),
    news: news.slice(2),
  }),
  scenario('friday', 'Friday', 'Friday evening, after practice', {
    now: at('2026-09-04T19:00:00Z'),
    news: news.slice(1),
    practice: practice.slice(0, 2),
  }),
  scenario('saturday', 'Saturday', 'Saturday evening, after qualifying', {
    now: at('2026-09-05T19:00:00Z'),
    news,
    practice,
    results: { quali: classification },
  }),
  scenario('race-morning', 'Race morning', 'Sunday morning, grid confirmed', {
    now: at('2026-09-06T09:30:00Z'),
    news: [gridNews, ...news],
    practice,
    results: { quali: classification },
  }),
  scenario('finished', 'Finished', 'Sunday evening, race result in', {
    now: at('2026-09-06T17:00:00Z'),
    news: [gridNews, ...news],
    practice,
    results: { quali: classification, race: classification },
  }),
  scenario('sprint', 'Sprint weekend', 'Saturday of a sprint weekend', {
    now: at('2026-05-02T18:00:00Z'),
    race: miami,
    weather: miamiWeather,
    practice: practice.slice(0, 1),
    results: { sprint_quali: classification, sprint: classification },
  }),
  scenario('off-season', 'Off-season', 'No race left in the season', {
    now: at('2026-12-20T09:00:00Z'),
    race: null,
    standings: sampleStandings,
    news: SAMPLE_OFF_SEASON_NEWS,
  }),
];
