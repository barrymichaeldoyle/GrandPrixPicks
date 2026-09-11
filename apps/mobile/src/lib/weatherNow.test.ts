import { describe, expect, it } from 'vitest';

import {
  bucketWeatherNow,
  pickForecastHour,
  WEATHER_NOW_BUCKET_MS,
} from './weatherNow';

describe('bucketWeatherNow', () => {
  it('floors to the start of the UTC hour', () => {
    expect(bucketWeatherNow(Date.UTC(2026, 8, 10, 13, 37, 22, 450))).toBe(
      Date.UTC(2026, 8, 10, 13),
    );
  });

  it('leaves an exact hour unchanged', () => {
    const hour = Date.UTC(2026, 8, 10, 14);
    expect(bucketWeatherNow(hour)).toBe(hour);
  });

  it('gives the same key to two times inside one idle cache window', () => {
    const first = Date.UTC(2026, 8, 10, 13, 4);
    const later = first + 4 * 60 * 1_000;
    expect(later - first).toBeLessThan(WEATHER_NOW_BUCKET_MS);
    expect(bucketWeatherNow(later)).toBe(bucketWeatherNow(first));
  });
});

describe('pickForecastHour', () => {
  const hours = [
    { at: Date.UTC(2026, 8, 6, 12), forecastPeriodHours: 1 },
    { at: Date.UTC(2026, 8, 6, 13), forecastPeriodHours: 1 },
  ];

  it('returns the hour whose period covers the session start', () => {
    expect(pickForecastHour(hours, Date.UTC(2026, 8, 6, 13, 20))?.at).toBe(
      Date.UTC(2026, 8, 6, 13),
    );
  });

  it('falls back to the nearest hour when none covers the start', () => {
    expect(pickForecastHour(hours, Date.UTC(2026, 8, 6, 15, 10))?.at).toBe(
      Date.UTC(2026, 8, 6, 13),
    );
  });

  it('returns undefined when there are no hours', () => {
    expect(pickForecastHour([], Date.UTC(2026, 8, 6, 13))).toBeUndefined();
  });
});
