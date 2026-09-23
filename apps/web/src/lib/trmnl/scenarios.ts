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
 * news carries no real publisher's name, so nothing here reads as a report of
 * what happened at a real race.
 */
export type TrmnlScenario = {
  id: string;
  label: string;
  /** What moment of the weekend this is, for the page caption. */
  moment: string;
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
 * Several sources, so the screens show how attribution varies. They name a
 * kind of source rather than a real publisher: this is sample news.
 */
const news: TrmnlInput['news'] = [
  {
    headline: 'Five-place grid penalty for a gearbox change',
    sourceName: "Sample stewards' document",
    affectsSessions: ['race'],
    publishedAt: at('2026-09-05T18:00:00Z'),
  },
  {
    headline: 'Rain forecast for qualifying',
    sourceName: 'Sample weather service',
    affectsSessions: ['quali'],
    publishedAt: at('2026-09-04T09:00:00Z'),
  },
  {
    headline: 'New floor for the home race',
    sourceName: 'Sample team statement',
    affectsSessions: [],
    publishedAt: at('2026-09-03T09:00:00Z'),
  },
];

const gridNews: TrmnlInput['news'][number] = {
  headline: 'Starting grid confirmed',
  sourceName: 'Sample timing sheet',
  affectsSessions: ['race'],
  publishedAt: at('2026-09-06T09:00:00Z'),
  startingGrid: classification.map((row) =>
    row.code === 'ANT' ? { ...row, note: '5-place penalty' } : row,
  ),
};

/**
 * An invented final season, for the off-season sample. The points are made
 * up; the order follows the sample grid.
 */
const DRIVER_POINTS = [412, 389, 331, 318, 290, 244, 231, 142, 128, 97];
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
    sourceName: 'Sample series announcement',
    affectsSessions: [],
    publishedAt: at('2026-12-18T10:00:00Z'),
  },
  {
    headline: 'Team reveals launch date for its new car',
    sourceName: 'Sample team statement',
    affectsSessions: [],
    publishedAt: at('2026-12-15T10:00:00Z'),
  },
  {
    headline: 'Sporting regulations updated for next season',
    sourceName: 'Sample governing body notice',
    affectsSessions: [],
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
  return {
    id,
    label,
    moment,
    payload: buildTrmnlPayload({ ...base, ...input }),
  };
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
