import { describe, expect, test } from 'vitest';

import {
  coversEverySession,
  getEventDates,
  isForecastStale,
  isWeatherEligible,
  mergeRetainedHours,
  parseMetNoForecast,
  shouldRefreshWeather,
  summarizeWeatherDays,
  type WeatherHour,
} from './weather';

const HOUR = 60 * 60 * 1_000;
const DAY = 24 * HOUR;

describe('weather eligibility', () => {
  const now = Date.parse('2026-09-01T12:00:00Z');

  test('opens nine days before the first scheduled weekend session', () => {
    const race = {
      fp1StartAt: now + 9 * DAY,
      qualiStartAt: now + 10 * DAY,
      raceStartAt: now + 11 * DAY,
    };
    expect(isWeatherEligible(race, now)).toBe(true);
    expect(
      isWeatherEligible({ ...race, fp1StartAt: now + 9 * DAY + 1 }, now),
    ).toBe(false);
  });

  test('retains the forecast through the post-race evening window', () => {
    expect(
      isWeatherEligible(
        { raceStartAt: now - 12 * HOUR, qualiStartAt: now - DAY },
        now,
      ),
    ).toBe(true);
    expect(
      isWeatherEligible(
        { raceStartAt: now - 12 * HOUR - 1, qualiStartAt: now - DAY },
        now,
      ),
    ).toBe(false);
  });

  test('respects both provider expiry and the distance-based cadence', () => {
    const race = { raceStartAt: now + 5 * DAY, fp1StartAt: now + 3 * DAY };
    expect(
      shouldRefreshWeather(race, now, {
        checkedAt: now - 5 * HOUR,
        expiresAt: now - HOUR,
      }),
    ).toBe(false);
    expect(
      shouldRefreshWeather(race, now, {
        checkedAt: now - 6 * HOUR,
        expiresAt: now - HOUR,
      }),
    ).toBe(true);
    expect(
      shouldRefreshWeather(race, now, {
        checkedAt: now - 7 * HOUR,
        expiresAt: now + HOUR,
      }),
    ).toBe(false);
  });
});

describe('MET Norway parsing', () => {
  test('keeps whole event days and ignores adjacent forecast days', () => {
    const response = {
      properties: {
        meta: { updated_at: '2026-09-04T00:00:00Z' },
        timeseries: [
          metHour('2026-09-05T23:00:00Z', 'clearsky_day', 20, 5),
          metHour('2026-09-06T06:00:00Z', 'clearsky_day', 18, 10),
          metHour('2026-09-06T15:00:00Z', 'rainshowers_day', 23, 55),
          metHour('2026-09-06T20:00:00Z', 'heavyrainandthunder', 19, 80),
          metHour('2026-09-07T00:00:00Z', 'cloudy', 17, 20),
        ],
      },
    };

    const parsed = parseMetNoForecast(response, 'UTC', new Set(['2026-09-06']));
    expect(parsed.hours.map((hour) => hour.localHour)).toEqual([6, 15, 20]);
    expect(parsed.days).toEqual([
      expect.objectContaining({
        localDate: '2026-09-06',
        minTemperatureC: 18,
        maxTemperatureC: 23,
        maxPrecipitationProbability: 80,
        dominantConditionCode: 'clearsky_day',
        hasThunderRisk: true,
      }),
    ]);
  });

  test('rejects malformed envelopes and empty event windows', () => {
    expect(() => parseMetNoForecast({}, 'UTC', new Set())).toThrow(
      'invalid forecast envelope',
    );
    expect(() =>
      parseMetNoForecast(
        {
          properties: {
            meta: { updated_at: '2026-09-04T00:00:00Z' },
            timeseries: [metHour('2026-09-06T06:00:00Z', 'clear', 18, 0)],
          },
        },
        'UTC',
        new Set(['2026-09-07']),
      ),
    ).toThrow('no hourly data');
  });

  test('uses medium-range six-hour periods until hourly data is available', () => {
    const row = metHour('2026-09-06T06:00:00Z', 'rain', 18, 65);
    const sixHourRow = {
      ...row,
      data: {
        instant: row.data.instant,
        next_6_hours: row.data.next_1_hours,
      },
    };
    const parsed = parseMetNoForecast(
      {
        properties: {
          meta: { updated_at: '2026-09-01T00:00:00Z' },
          timeseries: [sixHourRow],
        },
      },
      'UTC',
      new Set(['2026-09-06']),
    );
    expect(parsed.hours[0]).toMatchObject({
      at: Date.parse('2026-09-06T06:00:00Z'),
      forecastPeriodHours: 6,
      conditionCode: 'rain',
      precipitationProbability: 65,
    });
  });
});

test('event dates deduplicate sessions while preserving all event days', () => {
  expect(
    getEventDates(
      {
        fp1StartAt: Date.parse('2026-09-04T11:30:00Z'),
        fp2StartAt: Date.parse('2026-09-04T15:00:00Z'),
        qualiStartAt: Date.parse('2026-09-05T14:00:00Z'),
        raceStartAt: Date.parse('2026-09-06T13:00:00Z'),
      },
      'Europe/Rome',
    ),
  ).toEqual(['2026-09-04', '2026-09-05', '2026-09-06']);
});

test('daily summaries choose a deterministic dominant condition', () => {
  const hours: WeatherHour[] = [
    hour('cloudy', 18, 10),
    hour('clearsky_day', 20, 20, HOUR),
  ];
  expect(summarizeWeatherDays(hours)[0]?.dominantConditionCode).toBe(
    'clearsky_day',
  );
});

test('successful conditional checks stay fresh despite an old payload', () => {
  expect(isForecastStale({})).toBe(false);
  expect(isForecastStale({ lastRefreshError: 'provider unavailable' })).toBe(
    true,
  );
});

function metHour(
  time: string,
  conditionCode: string,
  temperatureC: number,
  precipitationProbability: number,
) {
  return {
    time,
    data: {
      instant: {
        details: {
          air_temperature: temperatureC,
          wind_speed: 4,
          wind_speed_of_gust: 7,
          wind_from_direction: 210,
        },
      },
      next_1_hours: {
        summary: { symbol_code: conditionCode },
        details: {
          precipitation_amount: precipitationProbability > 40 ? 2.4 : 0,
          probability_of_precipitation: precipitationProbability,
          probability_of_thunder: conditionCode.includes('thunder') ? 60 : 0,
        },
      },
    },
  };
}

function hour(
  conditionCode: string,
  temperatureC: number,
  precipitationProbability: number,
  offset = 0,
): WeatherHour {
  return {
    at: Date.parse('2026-09-06T06:00:00Z') + offset,
    localDate: '2026-09-06',
    localHour: 6 + offset / HOUR,
    forecastPeriodHours: 1,
    conditionCode,
    temperatureC,
    precipitationAmountMm: 0,
    precipitationProbability,
    windSpeedMps: 4,
  };
}

describe('retaining hours a refresh no longer covers', () => {
  function hour(
    at: number,
    localDate: string,
    temperatureC: number,
  ): WeatherHour {
    return {
      at,
      localDate,
      localHour: new Date(at).getUTCHours(),
      forecastPeriodHours: 1,
      temperatureC,
      conditionCode: 'clearsky_day',
      precipitationAmountMm: 0,
      windSpeedMps: 2,
    };
  }

  const friday = Date.UTC(2026, 8, 4, 12);
  const saturday = Date.UTC(2026, 8, 5, 14);
  const sunday = Date.UTC(2026, 8, 6, 13);
  const eventDates = new Set(['2026-09-04', '2026-09-05', '2026-09-06']);

  test('keeps a past session that the provider has stopped returning', () => {
    // Sunday's response has nothing to say about Friday practice, which is the
    // whole bug: the old code stored it as the entire truth and the write-up
    // rendered a dash where Friday's weather had been.
    const stored = [
      hour(friday, '2026-09-04', 24),
      hour(saturday, '2026-09-05', 27),
    ];
    const incoming = [hour(sunday, '2026-09-06', 32)];

    const merged = mergeRetainedHours(stored, incoming, eventDates);

    expect(merged.map((entry) => entry.at)).toEqual([friday, saturday, sunday]);
    expect(merged.map((entry) => entry.temperatureC)).toEqual([24, 27, 32]);
  });

  test('prefers the incoming forecast for an hour both cover', () => {
    const stored = [hour(sunday, '2026-09-06', 28)];
    const incoming = [hour(sunday, '2026-09-06', 32)];

    expect(mergeRetainedHours(stored, incoming, eventDates)).toEqual([
      hour(sunday, '2026-09-06', 32),
    ]);
  });

  test('drops a retained hour outside the weekend it belongs to', () => {
    const stale = Date.UTC(2026, 7, 30, 12);
    const stored = [hour(stale, '2026-08-30', 20)];
    const incoming = [hour(sunday, '2026-09-06', 32)];

    expect(mergeRetainedHours(stored, incoming, eventDates)).toEqual([
      hour(sunday, '2026-09-06', 32),
    ]);
  });

  test('is a plain copy when there is nothing stored yet', () => {
    const incoming = [hour(friday, '2026-09-04', 24)];

    expect(mergeRetainedHours(undefined, incoming, eventDates)).toEqual(
      incoming,
    );
  });
});

describe('coversEverySession', () => {
  const race = {
    fp1StartAt: Date.parse('2026-09-11T11:30:00Z'),
    qualiStartAt: Date.parse('2026-09-12T14:00:00Z'),
    raceStartAt: Date.parse('2026-09-13T13:00:00Z'),
  };
  function hourOf(iso: string) {
    return { at: Date.parse(iso) };
  }

  test('accepts hours that contain every session start', () => {
    expect(
      coversEverySession(race, [
        hourOf('2026-09-11T11:00:00Z'),
        hourOf('2026-09-12T14:00:00Z'),
        hourOf('2026-09-13T13:00:00Z'),
      ]),
    ).toBe(true);
  });

  test('rejects a record that kept race day only', () => {
    expect(
      coversEverySession(race, [
        hourOf('2026-09-13T12:00:00Z'),
        hourOf('2026-09-13T13:00:00Z'),
      ]),
    ).toBe(false);
  });

  test('does not count the hour after a start as covering it', () => {
    expect(
      coversEverySession(race, [
        hourOf('2026-09-11T12:00:00Z'),
        hourOf('2026-09-12T14:00:00Z'),
        hourOf('2026-09-13T13:00:00Z'),
      ]),
    ).toBe(false);
  });
});
