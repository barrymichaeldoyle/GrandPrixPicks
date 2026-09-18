/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('indexNow submission state', () => {
  it('starts with nothing announced, so the first sweep submits nothing', async () => {
    const t = convexTest(schema, modules);

    expect(await t.query(internal.indexNow.knownSubmissions, {})).toEqual([]);
  });

  it('remembers a stamp so the next sweep sees the page as unchanged', async () => {
    const t = convexTest(schema, modules);
    const entries = [
      {
        url: 'https://grandprixpicks.com/f1-2027-calendar',
        lastmod: '2026-09-17T00:00:00.000Z',
      },
    ];

    await t.mutation(internal.indexNow.recordSubmissions, { entries });

    expect(await t.query(internal.indexNow.knownSubmissions, {})).toEqual(
      entries,
    );
  });

  it('updates a URL in place rather than growing a row per sweep', async () => {
    const t = convexTest(schema, modules);
    const url = 'https://grandprixpicks.com/guides/f1-points-system-explained';

    await t.mutation(internal.indexNow.recordSubmissions, {
      entries: [{ url, lastmod: '2026-08-24T00:00:00.000Z' }],
    });
    await t.mutation(internal.indexNow.recordSubmissions, {
      entries: [{ url, lastmod: '2026-09-18T00:00:00.000Z' }],
    });

    // A row per submission would make `knownSubmissions` ambiguous and the
    // unique() lookup throw on the third sweep.
    expect(await t.query(internal.indexNow.knownSubmissions, {})).toEqual([
      { url, lastmod: '2026-09-18T00:00:00.000Z' },
    ]);
  });
});
