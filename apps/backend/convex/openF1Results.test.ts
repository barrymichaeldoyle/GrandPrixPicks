import { describe, expect, it } from 'vitest';

import {
  buildSessionDiscoveryUrl,
  getFallbackWindow,
  isLiveSessionRestriction,
  parseOpenF1Results,
  parseOpenF1Sessions,
} from './openF1Results';

describe('OpenF1 fallback timing', () => {
  it('starts two minutes after expected end and stops two hours after it', () => {
    const start = Date.UTC(2026, 6, 24, 12);
    expect(getFallbackWindow('quali', start)).toEqual({
      expectedEndAt: start + 60 * 60_000,
      firstAttemptAt: start + 62 * 60_000,
      deadlineAt: start + 180 * 60_000,
    });
  });

  it('builds OpenF1 comparison filters without an extra equals sign', () => {
    const start = Date.UTC(2026, 6, 19, 13);
    const url = buildSessionDiscoveryUrl(2026, start);

    expect(url.searchParams.get('date_start>')).toBe(
      '2026-07-19T12:50:00.000Z',
    );
    expect(url.searchParams.get('date_start<')).toBe(
      '2026-07-19T13:10:00.000Z',
    );
    expect(url.searchParams.has('date_start>=')).toBe(false);
    expect(url.searchParams.has('date_start<=')).toBe(false);
  });
});

describe('OpenF1 response validation', () => {
  it('accepts session metadata and sorts a complete classification', () => {
    expect(
      parseOpenF1Sessions([
        {
          session_key: 123,
          session_name: 'Qualifying',
          date_start: '2026-07-24T12:00:00Z',
        },
      ]),
    ).toHaveLength(1);

    const result = parseOpenF1Results([
      {
        driver_number: 4,
        position: 2,
        dnf: false,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 1,
        position: 1,
        dnf: false,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 81,
        position: 3,
        dnf: false,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 16,
        position: 4,
        dnf: false,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 44,
        position: 5,
        dnf: true,
        dns: false,
        dsq: false,
      },
    ]);

    expect(result.map((row) => row.driver_number)).toEqual([1, 4, 81, 16, 44]);
  });

  it('rejects duplicate positions', () => {
    expect(() =>
      parseOpenF1Results(
        Array.from({ length: 5 }, (_, index) => ({
          driver_number: index + 1,
          position: index === 4 ? 4 : index + 1,
          dnf: false,
          dns: false,
          dsq: false,
        })),
      ),
    ).toThrow('duplicate');
  });

  it('places OpenF1 null-position DNFs after classified finishers', () => {
    const result = parseOpenF1Results([
      {
        driver_number: 12,
        position: 1,
        dnf: false,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 16,
        position: 2,
        dnf: false,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 3,
        position: 3,
        dnf: false,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 18,
        position: null,
        dnf: true,
        dns: false,
        dsq: false,
      },
      {
        driver_number: 63,
        position: null,
        dnf: true,
        dns: false,
        dsq: false,
      },
    ]);

    expect(
      result.map(({ driver_number, position }) => ({
        driver_number,
        position,
      })),
    ).toEqual([
      { driver_number: 12, position: 1 },
      { driver_number: 16, position: 2 },
      { driver_number: 3, position: 3 },
      { driver_number: 18, position: 4 },
      { driver_number: 63, position: 5 },
    ]);
  });
});

describe('OpenF1 live-session restriction', () => {
  // OpenF1 shuts the free tier to anonymous callers while any session runs.
  // The deploy treats that as "come back later" and ships anyway, so this
  // predicate decides whether a race weekend can ship a fix at all.
  const liveSessionBody =
    'OpenF1 request failed with HTTP 401: {"detail":"Live F1 session in ' +
    'progress. Global API access (including past sessions) is restricted to ' +
    'authenticated users until the session ends."}';

  it('recognises the live-session refusal', () => {
    expect(isLiveSessionRestriction(new Error(liveSessionBody))).toBe(true);
  });

  it('reads the message off a non-Error rejection too', () => {
    expect(isLiveSessionRestriction(liveSessionBody)).toBe(true);
  });

  // The failure this must never swallow. A 401 that is genuinely about our
  // access has to keep blocking the deploy, or the check stops being one.
  it('does not match a 401 that is not about a live session', () => {
    expect(
      isLiveSessionRestriction(
        new Error(
          'OpenF1 request failed with HTTP 401: {"detail":"Invalid API key"}',
        ),
      ),
    ).toBe(false);
  });

  it('does not match an unexplained refusal', () => {
    expect(
      isLiveSessionRestriction(
        new Error('OpenF1 request failed with HTTP 401'),
      ),
    ).toBe(false);
  });

  it('does not match the other OpenF1 failures the smoke test reports', () => {
    for (const message of [
      'OpenF1 session 11334 was not found',
      'OpenF1 time-window session discovery did not round-trip',
      'Deployed drivers are missing OpenF1 number(s): 81',
      'OpenF1 returned only 3 classified drivers',
    ]) {
      expect(isLiveSessionRestriction(new Error(message)), message).toBe(false);
    }
  });
});
