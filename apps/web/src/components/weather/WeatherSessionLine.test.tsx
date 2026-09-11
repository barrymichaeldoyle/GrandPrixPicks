import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { RaceWeather, WeatherHour } from '@/lib/weatherPresentation';

import { WeatherSessionLine } from './WeatherSessionLine';

const HOUR = 60 * 60_000;
const qualiStartAt = Date.UTC(2026, 8, 5, 14);
const raceStartAt = Date.UTC(2026, 8, 6, 13);

const hours: WeatherHour[] = [
  {
    at: qualiStartAt,
    localDate: '2026-09-05',
    localHour: 16,
    forecastPeriodHours: 1,
    temperatureC: 31,
    conditionCode: 'clearsky_day',
    precipitationAmountMm: 0,
    precipitationProbability: 5,
    thunderProbability: 0,
    windSpeedMps: 3,
    windGustMps: 6,
  },
];

const weather: RaceWeather = {
  isStale: false,
  attribution: {
    name: 'MET Norway',
    url: 'https://www.met.no/en',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  forecast: {
    raceSlug: 'madrid-2026',
    timeZone: 'Europe/Madrid',
    provider: 'met_no',
    providerUpdatedAt: qualiStartAt - HOUR,
    fetchedAt: qualiStartAt - HOUR,
    checkedAt: qualiStartAt - HOUR,
    expiresAt: qualiStartAt + HOUR,
    eventDates: ['2026-09-05'],
    hours,
    days: [],
  },
};

describe('WeatherSessionLine', () => {
  it('renders the summary without a Forecast label', () => {
    const html = renderToStaticMarkup(
      <WeatherSessionLine
        race={{ slug: 'madrid-2026', qualiStartAt, raceStartAt }}
        weather={weather}
        sessionKey="quali"
      />,
    );

    expect(html).toContain('Clear · 31°C');
    expect(html).not.toContain('Forecast');
  });

  it('says nothing about a session the forecast does not cover', () => {
    const html = renderToStaticMarkup(
      <WeatherSessionLine
        race={{ slug: 'madrid-2026', qualiStartAt, raceStartAt }}
        weather={weather}
        sessionKey="race"
      />,
    );

    expect(html).toBe('');
  });
});
