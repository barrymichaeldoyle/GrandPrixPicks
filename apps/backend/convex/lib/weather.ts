import { v } from 'convex/values';

export const weatherHourValidator = v.object({
  at: v.number(),
  localDate: v.string(),
  localHour: v.number(),
  forecastPeriodHours: v.number(),
  temperatureC: v.number(),
  conditionCode: v.string(),
  precipitationAmountMm: v.number(),
  precipitationProbability: v.optional(v.number()),
  thunderProbability: v.optional(v.number()),
  windSpeedMps: v.number(),
  windGustMps: v.optional(v.number()),
  windDirectionDegrees: v.optional(v.number()),
});

export const weatherDayValidator = v.object({
  localDate: v.string(),
  minTemperatureC: v.number(),
  maxTemperatureC: v.number(),
  maxPrecipitationProbability: v.optional(v.number()),
  totalPrecipitationMm: v.number(),
  maxWindGustMps: v.optional(v.number()),
  dominantConditionCode: v.string(),
  hasThunderRisk: v.boolean(),
});

export type WeatherHour = {
  at: number;
  localDate: string;
  localHour: number;
  forecastPeriodHours: number;
  temperatureC: number;
  conditionCode: string;
  precipitationAmountMm: number;
  precipitationProbability?: number;
  thunderProbability?: number;
  windSpeedMps: number;
  windGustMps?: number;
  windDirectionDegrees?: number;
};

export type WeatherDay = {
  localDate: string;
  minTemperatureC: number;
  maxTemperatureC: number;
  maxPrecipitationProbability?: number;
  totalPrecipitationMm: number;
  maxWindGustMps?: number;
  dominantConditionCode: string;
  hasThunderRisk: boolean;
};

const HOUR = 60 * 60 * 1_000;
export const FORECAST_HORIZON_MS = 9 * 24 * HOUR;
export const FORECAST_RETENTION_AFTER_RACE_MS = 12 * HOUR;

type RaceSchedule = {
  fp1StartAt?: number;
  fp2StartAt?: number;
  fp3StartAt?: number;
  qualiStartAt?: number;
  sprintQualiStartAt?: number;
  sprintStartAt?: number;
  raceStartAt: number;
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function child(
  parent: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  return record(parent?.[key]);
}

export function localDateAndHour(at: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  function get(type: Intl.DateTimeFormatPartTypes) {
    return parts.find((part) => part.type === type)?.value;
  }
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = Number(get('hour'));
  if (!year || !month || !day || !Number.isInteger(hour)) {
    throw new Error(`Could not format a weather time in ${timeZone}`);
  }
  return { localDate: `${year}-${month}-${day}`, localHour: hour };
}

export function getEventDates(race: RaceSchedule, timeZone: string): string[] {
  const starts = [
    race.fp1StartAt,
    race.fp2StartAt,
    race.fp3StartAt,
    race.qualiStartAt,
    race.sprintQualiStartAt,
    race.sprintStartAt,
    race.raceStartAt,
  ].filter((value): value is number => value !== undefined);
  return [
    ...new Set(starts.map((at) => localDateAndHour(at, timeZone).localDate)),
  ]
    .sort()
    .slice(0, 4);
}

export function isWeatherEligible(race: RaceSchedule, now: number): boolean {
  const starts = [
    race.fp1StartAt,
    race.fp2StartAt,
    race.fp3StartAt,
    race.qualiStartAt,
    race.sprintQualiStartAt,
    race.sprintStartAt,
    race.raceStartAt,
  ].filter((value): value is number => value !== undefined);
  const firstEventAt = Math.min(...starts);
  return (
    firstEventAt <= now + FORECAST_HORIZON_MS &&
    race.raceStartAt + FORECAST_RETENTION_AFTER_RACE_MS >= now
  );
}

export function refreshIntervalMs(race: RaceSchedule, now: number): number {
  const untilRace = race.raceStartAt - now;
  if (untilRace <= 48 * HOUR) {
    return HOUR;
  }
  if (untilRace <= 6 * 24 * HOUR) {
    return 6 * HOUR;
  }
  return 12 * HOUR;
}

export function shouldRefreshWeather(
  race: RaceSchedule,
  now: number,
  previous: { checkedAt: number; expiresAt: number } | null,
): boolean {
  if (!isWeatherEligible(race, now)) {
    return false;
  }
  if (!previous) {
    return true;
  }
  return (
    previous.expiresAt <= now &&
    previous.checkedAt + refreshIntervalMs(race, now) <= now
  );
}

export function isForecastStale(forecast: {
  lastRefreshError?: string;
}): boolean {
  // A successful conditional check can legitimately leave fetchedAt old:
  // HTTP 304 means the provider confirmed that payload is still current.
  return forecast.lastRefreshError !== undefined;
}

export function summarizeWeatherDays(hours: WeatherHour[]): WeatherDay[] {
  const byDate = new Map<string, WeatherHour[]>();
  for (const hour of hours) {
    const day = byDate.get(hour.localDate) ?? [];
    day.push(hour);
    byDate.set(hour.localDate, day);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([localDate, dayHours]) => {
      const conditionCounts = new Map<string, number>();
      for (const hour of dayHours) {
        conditionCounts.set(
          hour.conditionCode,
          (conditionCounts.get(hour.conditionCode) ?? 0) + 1,
        );
      }
      const dominantConditionCode = [...conditionCounts.entries()].sort(
        ([codeA, countA], [codeB, countB]) =>
          countB - countA || codeA.localeCompare(codeB),
      )[0]![0];
      const precipitationProbabilities = dayHours.flatMap((hour) =>
        hour.precipitationProbability === undefined
          ? []
          : [hour.precipitationProbability],
      );
      const gusts = dayHours.flatMap((hour) =>
        hour.windGustMps === undefined ? [] : [hour.windGustMps],
      );
      return {
        localDate,
        minTemperatureC: Math.min(...dayHours.map((hour) => hour.temperatureC)),
        maxTemperatureC: Math.max(...dayHours.map((hour) => hour.temperatureC)),
        maxPrecipitationProbability:
          precipitationProbabilities.length > 0
            ? Math.max(...precipitationProbabilities)
            : undefined,
        totalPrecipitationMm:
          Math.round(
            dayHours.reduce(
              (total, hour) => total + hour.precipitationAmountMm,
              0,
            ) * 10,
          ) / 10,
        maxWindGustMps: gusts.length > 0 ? Math.max(...gusts) : undefined,
        dominantConditionCode,
        hasThunderRisk: dayHours.some(
          (hour) =>
            hour.conditionCode.includes('thunder') ||
            (hour.thunderProbability ?? 0) >= 20,
        ),
      };
    });
}

export function parseMetNoForecast(
  value: unknown,
  timeZone: string,
  eventDates: ReadonlySet<string>,
): { providerUpdatedAt: number; hours: WeatherHour[]; days: WeatherDay[] } {
  const root = record(value);
  const properties = child(root, 'properties');
  const meta = child(properties, 'meta');
  const updatedAtRaw = meta?.updated_at;
  const timeseries = properties?.timeseries;
  const providerUpdatedAt =
    typeof updatedAtRaw === 'string' ? Date.parse(updatedAtRaw) : Number.NaN;
  if (!Number.isFinite(providerUpdatedAt) || !Array.isArray(timeseries)) {
    throw new Error('MET Norway returned an invalid forecast envelope');
  }

  const hours = timeseries.flatMap((entry): WeatherHour[] => {
    const row = record(entry);
    const time = row?.time;
    const at = typeof time === 'string' ? Date.parse(time) : Number.NaN;
    if (!Number.isFinite(at)) {
      return [];
    }
    const { localDate, localHour } = localDateAndHour(at, timeZone);
    if (!eventDates.has(localDate)) {
      return [];
    }

    const data = child(row, 'data');
    const instantDetails = child(child(data, 'instant'), 'details');
    // MET's compact response becomes six-hourly in the medium range. Keep
    // those rows so the nine-day outlook works, then naturally replace them
    // with one-hour rows as the weekend gets closer.
    const nextOneHour = child(data, 'next_1_hours');
    const forecastPeriod = nextOneHour ?? child(data, 'next_6_hours');
    const forecastPeriodHours = nextOneHour ? 1 : 6;
    const nextHourSummary = child(forecastPeriod, 'summary');
    const nextHourDetails = child(forecastPeriod, 'details');
    const temperatureC = finiteNumber(instantDetails?.air_temperature);
    const windSpeedMps = finiteNumber(instantDetails?.wind_speed);
    const conditionCode = nextHourSummary?.symbol_code;
    if (
      temperatureC === undefined ||
      windSpeedMps === undefined ||
      typeof conditionCode !== 'string'
    ) {
      return [];
    }

    return [
      {
        at,
        localDate,
        localHour,
        forecastPeriodHours,
        temperatureC,
        conditionCode,
        precipitationAmountMm:
          finiteNumber(nextHourDetails?.precipitation_amount) ?? 0,
        precipitationProbability: finiteNumber(
          nextHourDetails?.probability_of_precipitation,
        ),
        thunderProbability: finiteNumber(
          nextHourDetails?.probability_of_thunder,
        ),
        windSpeedMps,
        windGustMps: finiteNumber(instantDetails?.wind_speed_of_gust),
        windDirectionDegrees: finiteNumber(instantDetails?.wind_from_direction),
      },
    ];
  });

  if (hours.length === 0) {
    throw new Error('MET Norway returned no hourly data for the event days');
  }
  hours.sort((a, b) => a.at - b.at);
  // Four complete event days is at most 100 points across a DST transition.
  const boundedHours = hours.slice(0, 100);
  return {
    providerUpdatedAt,
    hours: boundedHours,
    days: summarizeWeatherDays(boundedHours),
  };
}
