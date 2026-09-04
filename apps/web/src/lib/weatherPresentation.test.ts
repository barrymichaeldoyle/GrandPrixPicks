import { describe, expect, it } from 'vitest';

import {
  buildWeatherSessions,
  buildWeatherTimeline,
  conditionLabel,
  forecastAlert,
  sessionWeatherLine,
  summarizeSessionWindow,
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

    expect(forecastAlert(forecast(), session)).toContain(
      'Wetter weather is forecast after grand prix',
    );
  });

  it('says nothing at all about a session with settled hours either side', () => {
    // The strip already prints the condition, the temperature and the rain
    // chance for this session; a sentence repeating one of them is the page
    // saying the same thing twice.
    const session = buildWeatherSessions({ raceStartAt: raceAt })[0]!;
    const dry = forecast({
      hours: forecast().hours.map((entry) => ({
        ...entry,
        conditionCode: 'clearsky_day',
        precipitationAmountMm: 0,
        precipitationProbability: 0,
        thunderProbability: 0,
      })),
    });

    expect(forecastAlert(dry, session)).toBeNull();
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

describe('session weather line', () => {
  const sessions = buildWeatherSessions({
    raceStartAt: raceAt,
    qualiStartAt: Date.UTC(2026, 8, 6, 16),
  });
  function session(key: string) {
    return sessions.find((candidate) => candidate.key === key)!;
  }

  function line(key: string, override: Partial<WeatherForecast> = {}) {
    const summary = summarizeSessionWindow(forecast(override), session(key));
    return summary && sessionWeatherLine(summary);
  }

  it('drops a rain chance nobody would pick differently on', () => {
    expect(line('race')).toBe('Clear · 21°C');
  });

  it('keeps the chance, without repeating a condition that says rain', () => {
    expect(line('quali')).toBe('Rain · 22°C · 70%');
  });

  it('names what the chance is of when the condition does not', () => {
    expect(
      line('race', {
        hours: forecast().hours.map((hour) => ({
          ...hour,
          conditionCode: 'partlycloudy_day',
          precipitationProbability: 40,
        })),
      }),
    ).toBe('Partly cloudy · 21°C · 40% rain');
  });

  it('has nothing to say about a session the forecast no longer covers', () => {
    // The row falls back to the next session on this, so a null here is what
    // keeps a locked tab from showing an empty forecast.
    expect(
      summarizeSessionWindow(forecast(), {
        key: 'fp1',
        label: 'Practice 1',
        startsAt: Date.UTC(2026, 8, 5, 13),
        endsAt: Date.UTC(2026, 8, 5, 14),
      }),
    ).toBeNull();
  });
});
