import { describe, expect, it } from 'vitest';

import {
  buildWeatherSessions,
  buildWeatherTimeline,
  conditionLabel,
  forecastAlert,
  sessionWeatherLine,
  summarizeSessionWindow,
  weatherForSession,
  windCompassPoint,
  windFigure,
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

  /**
   * The shape the provider sends beyond about three days: instantaneous
   * readings six hours apart, each carrying a six-hour precipitation window.
   * These are Madrid's real numbers for 12 September 2026.
   */
  function sixHourly(): Partial<WeatherForecast> {
    return {
      hours: [8, 14, 20].map((localHour, index) => ({
        at: Date.UTC(2026, 8, 6, localHour),
        localDate: '2026-09-06',
        localHour,
        forecastPeriodHours: 6,
        temperatureC: [17, 28.4, 29.8][index]!,
        conditionCode: 'clearsky_day',
        precipitationAmountMm: 0,
        precipitationProbability: 0,
        windSpeedMps: 3,
      })),
    };
  }

  it('reads a six-hourly forecast at the session, not at the block it falls in', () => {
    // A session at 12:30 sat inside the block whose reading was taken at 08:00
    // and was labelled with the morning temperature: 17°C for a lunchtime
    // practice on a day topping 29°C.
    const summary = summarizeSessionWindow(forecast(sixHourly()), {
      key: 'fp3',
      label: 'Practice 3',
      startsAt: Date.UTC(2026, 8, 6, 12, 30),
      endsAt: Date.UTC(2026, 8, 6, 13, 30),
    });

    expect(summary?.temperatureC).toBe(27);
  });

  it('never reports a temperature the forecast predicts for no hour', () => {
    // A session spanning two blocks averaged their readings, which put a
    // figure on the page that sits between the morning and the afternoon and
    // matches neither.
    const summary = summarizeSessionWindow(forecast(sixHourly()), {
      key: 'fp1',
      label: 'Practice 1',
      startsAt: Date.UTC(2026, 8, 6, 13, 30),
      endsAt: Date.UTC(2026, 8, 6, 14, 30),
    });

    expect(summary?.temperatureC).toBe(28);
  });

  it('still aggregates rain across every block the session runs through', () => {
    const wet = forecast({
      hours: sixHourly().hours!.map((hour, index) => ({
        ...hour,
        conditionCode: index === 1 ? 'rain' : 'clearsky_day',
        precipitationProbability: index === 1 ? 70 : 0,
      })),
    });

    const summary = summarizeSessionWindow(wet, {
      key: 'fp1',
      label: 'Practice 1',
      startsAt: Date.UTC(2026, 8, 6, 13, 30),
      endsAt: Date.UTC(2026, 8, 6, 14, 30),
    });

    expect(summary?.conditionCode).toBe('rain');
    expect(summary?.precipitationProbability).toBe(70);
  });

  it('has nothing to say about a session the forecast no longer covers', () => {
    expect(
      summarizeSessionWindow(forecast(), {
        key: 'fp1',
        label: 'Practice 1',
        startsAt: Date.UTC(2026, 8, 5, 13),
        endsAt: Date.UTC(2026, 8, 5, 14),
      }),
    ).toBeNull();
  });

  it('names a scheduled session and ignores one the race does not run', () => {
    const race = {
      raceStartAt: raceAt,
      fp1StartAt: Date.UTC(2026, 8, 6, 10),
    };
    expect(weatherForSession(forecast(), race, 'fp1')?.session.key).toBe('fp1');
    expect(weatherForSession(forecast(), race, 'fp2')).toBeNull();
  });
});

describe('wind', () => {
  const race = buildWeatherSessions({ raceStartAt: raceAt })[0]!;

  function gusting(windGustMps: number): Partial<WeatherForecast> {
    return {
      hours: forecast().hours.map((hour) => ({
        ...hour,
        windSpeedMps: 4.4,
        windGustMps,
        windDirectionDegrees: 350,
      })),
    };
  }

  it('reads the direction the wind blows from on an eight-point compass', () => {
    expect(windCompassPoint(0)).toBe('N');
    expect(windCompassPoint(350)).toBe('N');
    expect(windCompassPoint(44)).toBe('NE');
    expect(windCompassPoint(200)).toBe('S');
    expect(windCompassPoint(-90)).toBe('W');
  });

  it('gives sustained wind in km/h with its direction', () => {
    const summary = summarizeSessionWindow(forecast(gusting(6)), race);

    expect(summary && windFigure(summary)).toBe('N 16 km/h');
    expect(windFigure({ windSpeedMps: 4.4 })).toBe('16 km/h');
  });

  it('reports the strongest gust the session runs through', () => {
    const hours = forecast(gusting(6)).hours.map((entry) =>
      entry.at === raceAt + hour ? { ...entry, windGustMps: 12 } : entry,
    );
    const summary = summarizeSessionWindow(forecast({ hours }), race);

    expect(summary?.windGustMps).toBe(12);
  });

  it('puts gusts on the one-line forecast only once they are strong', () => {
    const quiet = summarizeSessionWindow(forecast(gusting(10.8)), race);
    const strong = summarizeSessionWindow(forecast(gusting(12)), race);

    expect(quiet && sessionWeatherLine(quiet)).toBe('Clear · 21°C');
    expect(strong && sessionWeatherLine(strong)).toBe(
      'Clear · 21°C · Gusts 43 km/h',
    );
  });

  it('adds the sustained wind ahead of the gusts when asked', () => {
    const strong = summarizeSessionWindow(forecast(gusting(12)), race);
    const sustained = strong && windFigure(strong);

    expect(sustained).not.toBe(null);
    expect(strong && sessionWeatherLine(strong, { wind: true })).toBe(
      `Clear · 21°C · ${sustained} · Gusts 43 km/h`,
    );
  });

  it('carries wind onto the hour-by-hour periods', () => {
    const timeline = buildWeatherTimeline(forecast(gusting(12)), [race]);
    const period = timeline[0]!.periods[0]!;

    expect(windFigure(period)).toBe('N 16 km/h');
    expect(period.maxWindGustMps).toBe(12);
  });
});
