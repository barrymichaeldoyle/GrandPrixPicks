import { describe, expect, it, vi } from 'vitest';

// `dates.ts` imports convex/react at module scope for its hook; we only test
// the pure formatters, so stub the hook out to keep the module hermetic.
vi.mock('convex/react', () => ({ useQuery: () => undefined }));
vi.mock('../integrations/convex/api', () => ({ api: {} }));

import { formatRaceDate } from './dates';

describe('formatRaceDate', () => {
  const iso = '2026-05-24T13:00:00.000Z';

  it('formats both a local and a track-time string', () => {
    const result = formatRaceDate(iso, 'monaco-gp', {
      locale: 'en-GB',
      timezone: 'Europe/London',
    });

    expect(typeof result.local).toBe('string');
    expect(result.local.length).toBeGreaterThan(0);
    expect(typeof result.track).toBe('string');
    expect(result.track.length).toBeGreaterThan(0);
    expect(typeof result.trackTimeZone).toBe('string');
  });

  it('renders local time in the requested timezone', () => {
    const london = formatRaceDate(iso, 'monaco-gp', {
      locale: 'en-GB',
      timezone: 'Europe/London',
    });
    const tokyo = formatRaceDate(iso, 'monaco-gp', {
      locale: 'en-GB',
      timezone: 'Asia/Tokyo',
    });

    // 13:00 UTC is a different wall-clock time in London vs Tokyo.
    expect(london.local).not.toBe(tokyo.local);
  });

  it('falls back to device default when given a bad locale/timezone', () => {
    expect(() =>
      formatRaceDate(iso, 'monaco-gp', {
        locale: 'not-a-locale!!',
        timezone: 'Not/AZone',
      }),
    ).not.toThrow();
  });

  it('defaults the track timezone to UTC for an unknown race slug', () => {
    const result = formatRaceDate(iso, 'totally-unknown-race');
    expect(result.trackTimeZone).toBe('UTC');
  });
});
