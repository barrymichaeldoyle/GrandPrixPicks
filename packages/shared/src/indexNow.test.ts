import { describe, expect, it } from 'vitest';

import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  indexNowUrlsForPublishedResult,
} from './indexNow';

describe('indexNow', () => {
  it('points the key path at the key, so verification can succeed', () => {
    // The protocol authenticates by fetching this file and comparing it to the
    // submitted key. If these two drift apart every submission is rejected,
    // silently, and the only symptom is that nothing gets indexed faster.
    expect(INDEXNOW_KEY_PATH).toBe(`/${INDEXNOW_KEY}.txt`);
  });

  it('uses a key the protocol accepts', () => {
    // IndexNow requires 8-128 characters, hex only.
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{8,128}$/);
  });

  it('submits the race page and the tables a result moves', () => {
    const urls = indexNowUrlsForPublishedResult(
      'https://grandprixpicks.com',
      'australia-2026',
    );

    expect(urls).toContain('https://grandprixpicks.com/races/australia-2026');
    expect(urls).toContain('https://grandprixpicks.com/f1-standings');
    expect(urls).toContain('https://grandprixpicks.com/f1-team-mate-battles');
    expect(urls).toContain('https://grandprixpicks.com/leaderboard');
  });

  it('submits nothing a published result does not change', () => {
    const urls = indexNowUrlsForPublishedResult(
      'https://grandprixpicks.com',
      'australia-2026',
    );

    // Quota is spent per URL, and the guides and policy pages are static.
    expect(urls.some((url) => url.includes('/guides'))).toBe(false);
    expect(urls.some((url) => url.includes('/about'))).toBe(false);
  });

  it('does not double the slash when the origin has a trailing one', () => {
    const urls = indexNowUrlsForPublishedResult(
      'https://grandprixpicks.com/',
      'australia-2026',
    );

    expect(urls).toContain('https://grandprixpicks.com/races/australia-2026');
    expect(urls.every((url) => !url.includes('.com//'))).toBe(true);
  });
});
