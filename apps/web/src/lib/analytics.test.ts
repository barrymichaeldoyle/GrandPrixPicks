import { afterEach, describe, expect, it, vi } from 'vitest';

import { localeProperties, pageViewProperties } from './analytics';

describe('localeProperties', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('splits the regional tag into a targetable base language', () => {
    vi.stubGlobal('navigator', { language: 'fr-CA' });

    // Feature flags match on `language`: targeting `locale` would mean listing
    // fr-FR / fr-CA / fr-BE to reach the same readers.
    expect(localeProperties()).toMatchObject({
      locale: 'fr-CA',
      language: 'fr',
    });
  });

  it('keeps a language-only tag intact', () => {
    vi.stubGlobal('navigator', { language: 'de' });

    expect(localeProperties()).toMatchObject({ locale: 'de', language: 'de' });
  });

  it('reports the resolved timezone alongside the locale', () => {
    vi.stubGlobal('navigator', { language: 'en-ZA' });

    const { timezone } = localeProperties();
    expect(timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('returns nothing to send when there is no browser', () => {
    // Server render: no navigator, and no guessing from the host's own locale.
    vi.stubGlobal('navigator', undefined);

    expect(localeProperties()).toEqual({});
  });
});

describe('pageViewProperties', () => {
  it('keeps the route stable while preserving bounded campaign dimensions', () => {
    expect(
      pageViewProperties(
        '/?utm_source=bci&utm_medium=sponsorship&utm_campaign=conference',
      ),
    ).toEqual({
      path: '/',
      utm_source: 'bci',
      utm_medium: 'sponsorship',
      utm_campaign: 'conference',
    });
  });

  it('does not fragment application routes by their query string', () => {
    expect(pageViewProperties('/leaderboard?time=weekend').path).toBe(
      '/leaderboard',
    );
  });
});
