import { describe, expect, it } from 'vitest';

import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  INDEXNOW_SWEEP_LIMIT,
  indexNowSitemapDelta,
  indexNowUrlsForPublishedPractice,
  indexNowUrlsForPublishedResult,
  isCoveredByPublishPing,
  parseSitemapEntries,
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

  it('submits the practice page a first classification makes indexable', () => {
    const urls = indexNowUrlsForPublishedPractice(
      'https://grandprixpicks.com',
      'australia-2026',
    );

    // This is the whole point of the practice ping: before FP1 the page ships
    // `noindex`, and nothing else tells a search engine that it stopped.
    expect(urls).toContain(
      'https://grandprixpicks.com/races/australia-2026/practice',
    );
    expect(urls).toContain('https://grandprixpicks.com/races/australia-2026');
  });

  it('does not spend practice quota on tables practice cannot move', () => {
    const urls = indexNowUrlsForPublishedPractice(
      'https://grandprixpicks.com',
      'australia-2026',
    );

    // Nobody is scored on practice and no championship point changes hands, so
    // submitting the standings would be asking Bing to recrawl an identical
    // page.
    expect(urls.some((url) => url.includes('/f1-standings'))).toBe(false);
    expect(urls.some((url) => url.includes('/leaderboard'))).toBe(false);
    expect(urls.some((url) => url.includes('/f1-team-mate-battles'))).toBe(
      false,
    );
  });

  it('does not double the slash for practice either', () => {
    const urls = indexNowUrlsForPublishedPractice(
      'https://grandprixpicks.com/',
      'australia-2026',
    );

    expect(urls.every((url) => !url.includes('.com//'))).toBe(true);
  });
});

describe('indexNow sitemap sweep', () => {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://grandprixpicks.com/f1-2027-calendar</loc><lastmod>2026-09-17T00:00:00.000Z</lastmod></url>
  <url><loc>https://grandprixpicks.com/guides/f1-points-system-explained</loc><lastmod>2026-08-24T00:00:00.000Z</lastmod></url>
  <url><loc>https://grandprixpicks.com/f1-qualifying-standings</loc><changefreq>daily</changefreq></url>
  <url><loc>https://grandprixpicks.com/races/australia-2026</loc><lastmod>2026-03-08T00:00:00.000Z</lastmod></url>
</urlset>`;

  it('reads only the entries that declare a lastmod', () => {
    const entries = parseSitemapEntries(sitemap);

    // `/f1-qualifying-standings` has no review stamp to compare against. An
    // entry without a lastmod is not a page that just changed.
    expect(entries.map((entry) => entry.loc)).toEqual([
      'https://grandprixpicks.com/f1-2027-calendar',
      'https://grandprixpicks.com/guides/f1-points-system-explained',
      'https://grandprixpicks.com/races/australia-2026',
    ]);
  });

  it('leaves the URLs a published result already pings to that path', () => {
    for (const url of indexNowUrlsForPublishedResult(
      'https://grandprixpicks.com',
      'australia-2026',
    )) {
      expect(isCoveredByPublishPing(url)).toBe(true);
    }
    for (const url of indexNowUrlsForPublishedPractice(
      'https://grandprixpicks.com',
      'australia-2026',
    )) {
      expect(isCoveredByPublishPing(url)).toBe(true);
    }
  });

  it('claims the hand-edited pages nothing else announces', () => {
    for (const path of [
      '/f1-2027-calendar',
      '/f1-2027-driver-line-up',
      '/guides/f1-points-system-explained',
      '/f1-2026-azerbaijan-grand-prix-predictions',
    ]) {
      expect(isCoveredByPublishPing(`https://grandprixpicks.com${path}`)).toBe(
        false,
      );
    }
  });

  it('matches a covered path through a trailing slash or a query string', () => {
    // The sitemap writes the home page as `https://host/`, and an entry that
    // picks up a query string must not read as a different, uncovered page.
    for (const loc of [
      'https://grandprixpicks.com/',
      'https://grandprixpicks.com/races/australia-2026/',
      'https://grandprixpicks.com/races/australia-2026?utm_source=x',
      'https://grandprixpicks.com/leaderboard#top',
    ]) {
      expect(isCoveredByPublishPing(loc)).toBe(true);
    }
  });

  it('does not mistake a deeper race path for a covered one', () => {
    // Only the race page and its practice child are pinged on publish.
    expect(
      isCoveredByPublishPing(
        'https://grandprixpicks.com/races/australia-2026/qualifying',
      ),
    ).toBe(false);
  });

  it('records a URL on first sight without submitting it', () => {
    const { submit, record } = indexNowSitemapDelta(
      parseSitemapEntries(sitemap),
      new Map(),
    );

    // Nothing here changed; the sweep has simply never seen it before.
    expect(submit).toEqual([]);
    expect(record.map((entry) => entry.loc)).toEqual([
      'https://grandprixpicks.com/f1-2027-calendar',
      'https://grandprixpicks.com/guides/f1-points-system-explained',
    ]);
  });

  it('submits a page whose lastmod moved since the last sweep', () => {
    const { submit, record } = indexNowSitemapDelta(
      parseSitemapEntries(sitemap),
      new Map([
        [
          'https://grandprixpicks.com/f1-2027-calendar',
          '2026-09-01T00:00:00.000Z',
        ],
        [
          'https://grandprixpicks.com/guides/f1-points-system-explained',
          '2026-08-24T00:00:00.000Z',
        ],
      ]),
    );

    expect(submit.map((entry) => entry.loc)).toEqual([
      'https://grandprixpicks.com/f1-2027-calendar',
    ]);
    expect(record).toHaveLength(1);
  });

  it('submits nothing when every stamp is unchanged', () => {
    const entries = parseSitemapEntries(sitemap);
    const known = new Map(entries.map((entry) => [entry.loc, entry.lastmod]));

    expect(indexNowSitemapDelta(entries, known)).toEqual({
      submit: [],
      record: [],
    });
  });

  it('caps a sweep so a bad diff cannot burn the quota', () => {
    const entries = Array.from(
      { length: INDEXNOW_SWEEP_LIMIT + 10 },
      (_, i) => ({
        loc: `https://grandprixpicks.com/guides/guide-${i}`,
        lastmod: '2026-09-18T00:00:00.000Z',
      }),
    );
    const known = new Map(
      entries.map((entry) => [entry.loc, '2026-01-01T00:00:00.000Z']),
    );

    const { submit, record } = indexNowSitemapDelta(entries, known);

    expect(submit).toHaveLength(INDEXNOW_SWEEP_LIMIT);
    // The overflow is deliberately NOT recorded. Banking a stamp that was
    // never announced would drop those pages silently; leaving them unrecorded
    // means the next sweep still sees them as changed.
    expect(record).toHaveLength(INDEXNOW_SWEEP_LIMIT);
  });
});
