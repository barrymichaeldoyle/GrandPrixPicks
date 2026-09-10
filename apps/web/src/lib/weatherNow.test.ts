import { describe, expect, it } from 'vitest';

import { bucketWeatherNow, WEATHER_NOW_BUCKET_MS } from './weatherNow';

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
