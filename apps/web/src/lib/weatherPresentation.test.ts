import { describe, expect, it } from 'vitest';

import {
  buildWeatherSessions,
  buildWeatherTimeline,
  conditionLabel,
  forecastNarrative,
  weekendWeatherOutlook,
  type WeatherDay,
  type WeatherForecast,
} from './weatherPresentation';

const hour = 60 * 60_000;
const raceAt = Date.UTC(2026, 8, 6, 13);

function forecast(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
  const hours = Array.from({ length: 18 }, (_, index) => ({
    at: Date.UTC(2026, 8, 6, 4 + index),
    localDate: '2026-09-06',
    localHour: 6 + index,
    forecastPeriodHours: 1,
    temperatureC: 18 + index / 3,
    conditionCode: index >= 12 ? 'rain' : 'clearsky_day',
    precipitationAmountMm: index >= 12 ? 0.8 : 0,
    precipitationProbability: index >= 12 ? 70 : 10,
    windSpeedMps: 3,
    windGustMps: 6,
  }));

  return {
    raceSlug: 'italy-2026',
    timeZone: 'Europe/Rome',
    provider: 'met_no',
    providerUpdatedAt: raceAt - hour,
    fetchedAt: raceAt - hour,
    expiresAt: raceAt + hour,
    checkedAt: raceAt - hour,
    eventDates: ['2026-09-06'],
    hours,
    days: [],
    ...overrides,
  };
}

describe('weather presentation', () => {
  it('builds the race window and highlights every overlapping period', () => {
    const sessions = buildWeatherSessions({ raceStartAt: raceAt });
    const timeline = buildWeatherTimeline(forecast(), sessions);

    expect(sessions[0]).toMatchObject({
      key: 'race',
      startsAt: raceAt,
      endsAt: raceAt + 2 * hour,
    });
    expect(
      timeline[0]?.periods.filter((period) => period.sessions.length > 0),
    ).toHaveLength(1);
  });

  it('mentions weather after the race instead of treating the start as isolated', () => {
    const session = buildWeatherSessions({ raceStartAt: raceAt })[0]!;

    expect(forecastNarrative(forecast(), session)).toContain(
      'Wetter weather is forecast later',
    );
  });

  it('uses six-hour outlook blocks to cover sessions in the medium range', () => {
    const sessions = buildWeatherSessions({ raceStartAt: raceAt });
    const sixHourForecast = forecast({
      hours: [
        {
          at: Date.UTC(2026, 8, 6, 10),
          localDate: '2026-09-06',
          localHour: 12,
          forecastPeriodHours: 6,
          temperatureC: 22,
          conditionCode: 'rain',
          precipitationAmountMm: 2,
          precipitationProbability: 60,
          windSpeedMps: 4,
        },
      ],
    });

    const timeline = buildWeatherTimeline(sixHourForecast, sessions);

    expect(timeline[0]?.periods[0]).toMatchObject({
      localHour: 12,
      sessions: [expect.objectContaining({ key: 'race' })],
    });
    expect(timeline[0]?.periods[0]?.endsAt).toBe(Date.UTC(2026, 8, 6, 16));
  });

  it('normalizes provider condition suffixes', () => {
    expect(conditionLabel('partlycloudy_night')).toBe('Partly cloudy');
    expect(conditionLabel('heavyrainandthunder_day')).toBe('Thunderstorms');
  });
});

function day(overrides: Partial<WeatherDay> = {}): WeatherDay {
  return {
    localDate: '2026-09-06',
    minTemperatureC: 19,
    maxTemperatureC: 28,
    totalPrecipitationMm: 0,
    maxPrecipitationProbability: 5,
    maxWindGustMps: 6,
    dominantConditionCode: 'clearsky_day',
    hasThunderRisk: false,
    ...overrides,
  };
}

describe('weekendWeatherOutlook', () => {
  it('calls a dry weekend settled and states the range once', () => {
    const outlook = weekendWeatherOutlook(
      forecast({ days: [day(), day({ maxTemperatureC: 30 })] }),
    );

    expect(outlook.settled).toBe(true);
    expect(outlook.summary).toBe(
      'Dry across every session in the current model, 19–30°C.',
    );
  });

  it('is not settled when rain is even a modest possibility', () => {
    // The threshold is deliberately low: hiding the detail on a weekend that
    // turns wet costs the reader the thing they came for.
    expect(
      weekendWeatherOutlook(
        forecast({ days: [day({ maxPrecipitationProbability: 20 })] }),
      ).settled,
    ).toBe(false);
  });

  it('is not settled on thunder risk, measurable rain, or strong gusts', () => {
    const cases: Partial<WeatherDay>[] = [
      { hasThunderRisk: true },
      { totalPrecipitationMm: 0.4 },
      { maxWindGustMps: 13 },
    ];
    for (const override of cases) {
      expect(
        weekendWeatherOutlook(forecast({ days: [day(override)] })).settled,
        JSON.stringify(override),
      ).toBe(false);
    }
  });

  it('keeps a single temperature when the weekend does not move', () => {
    expect(
      weekendWeatherOutlook(
        forecast({ days: [day({ minTemperatureC: 22, maxTemperatureC: 22 })] }),
      ).summary,
    ).toContain('22°C.');
  });

  it('is not settled when there are no days to judge', () => {
    // No data is not the same as good weather, so this must not collapse the
    // detail on the strength of an empty array.
    expect(weekendWeatherOutlook(forecast({ days: [] })).settled).toBe(false);
  });
});
