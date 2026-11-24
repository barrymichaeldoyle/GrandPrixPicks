/// <reference types="vite/client" />
import rateLimiter from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import { decodeCursor, encodeCursor } from './newsApi';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;

async function setup(plan: 'free' | 'hobby' | 'commercial' = 'commercial') {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const now = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test Grand Prix',
      slug: 'test-2026',
      raceStartAt: now + 24 * HOUR,
      predictionLockAt: now + 24 * HOUR,
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    });
    for (const [code, displayName, team] of [
      ['ANT', 'Kimi Antonelli', 'Mercedes'],
      ['RUS', 'George Russell', 'Mercedes'],
      ['LEC', 'Charles Leclerc', 'Ferrari'],
    ] as const) {
      await ctx.db.insert('drivers', {
        code,
        displayName,
        team,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  const { key } = await t.mutation(internal.newsApi.createKey, {
    label: 'test',
    plan,
  });
  return { t, key };
}

function story(key: string, driverCodes?: string[], raceSlug = 'test-2026') {
  return {
    raceSlug,
    key,
    headline: `Headline for ${key}`,
    body: `The body of the story filed as ${key}.`,
    category: 'general' as const,
    affectsSessions: [],
    driverCodes,
    sourceName: 'Formula 1',
    sourceUrl: `https://example.com/${key}`,
  };
}

/** Far enough ahead that every write in the test has settled. */
function later() {
  return Date.now() + HOUR;
}

describe('news API keys', () => {
  it('refuses a missing, malformed or revoked key', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, story('first'));

    for (const apiKey of ['', 'gpp_short', `gpp_${'a'.repeat(40)}`]) {
      expect(
        await t.query(internal.newsApi.list, { apiKey, now: later() }),
      ).toEqual({ ok: false, error: 'unauthorized' });
    }

    const [listed] = await t.query(internal.newsApi.listKeys, {});
    expect(listed).toMatchObject({ label: 'test', revokedAt: null });
    expect(key.startsWith(listed!.prefix)).toBe(true);
    // The key is never stored, only its hash.
    const rows = await t.run((ctx) => ctx.db.query('newsApiKeys').collect());
    expect(JSON.stringify(rows)).not.toContain(key);

    await t.mutation(internal.newsApi.revokeKey, { id: listed!.id });
    expect(
      await t.query(internal.newsApi.list, { apiKey: key, now: later() }),
    ).toEqual({ ok: false, error: 'unauthorized' });
    expect(
      await t.query(internal.newsApi.get, {
        apiKey: key,
        id: 'anything',
        now: later(),
      }),
    ).toEqual({ ok: false, error: 'unauthorized' });
  });
});

describe('news API list', () => {
  it('serves weekend and race-independent news as one list, newest first', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, story('weekend', ['ANT']));
    await t.mutation(internal.globalNews.publish, {
      key: 'season-story',
      headline: 'A season-wide story',
      body: 'Something about the calendar as a whole.',
      team: 'Ferrari',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/season',
    });

    const result = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.data.map((item) => item.key).sort()).toEqual([
      'season-story',
      'weekend',
    ]);
    const weekend = result.data.find((item) => item.key === 'weekend');
    expect(weekend).toMatchObject({
      status: 'published',
      language: 'en',
      race: { slug: 'test-2026', name: 'Test Grand Prix', round: 1 },
      drivers: [
        { code: 'ANT', number: null, name: 'Kimi Antonelli', team: 'Mercedes' },
      ],
      team: 'Mercedes',
      source: { name: 'Formula 1', publishedAt: null },
      startingGrid: null,
    });
    expect(
      result.data.find((item) => item.key === 'season-story'),
    ).toMatchObject({ race: null, team: 'Ferrari', drivers: [], sessions: [] });

    const one = await t.query(internal.newsApi.get, {
      apiKey: key,
      id: weekend!.id,
      now: later(),
    });
    expect(one).toEqual({ ok: true, data: weekend });
    expect(
      await t.query(internal.newsApi.get, {
        apiKey: key,
        id: 'nope',
        now: later(),
      }),
    ).toEqual({ ok: false, error: 'not_found' });
  });

  it('pages without repeating or dropping a story, same-millisecond stamps included', async () => {
    const { t, key } = await setup();
    for (let index = 0; index < 7; index += 1) {
      await t.mutation(internal.raceNews.publish, story(`story-${index}`));
    }
    // A batch can land inside one millisecond; a bare timestamp cursor would
    // skip the rest of it.
    await t.run(async (ctx) => {
      const rows = await ctx.db.query('raceNews').collect();
      for (const row of rows.slice(0, 4)) {
        await ctx.db.patch(row._id, { publishedAt: 1_000 });
      }
    });

    const seen: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page += 1) {
      const result = await t.query(internal.newsApi.list, {
        apiKey: key,
        now: later(),
        limit: 3,
        cursor,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      seen.push(...result.data.map((item) => item.key));
      if (!result.nextCursor) {
        break;
      }
      cursor = result.nextCursor;
    }
    expect(seen).toHaveLength(7);
    expect(new Set(seen).size).toBe(7);
  });

  it('filters by race, driver and team', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, story('mercedes', ['ANT']));
    await t.mutation(internal.raceNews.publish, story('ferrari', ['LEC']));
    await t.mutation(internal.raceNews.publish, story('both', ['RUS', 'LEC']));

    async function keys(filter: {
      race?: string;
      driver?: string;
      team?: string;
    }) {
      const result = await t.query(internal.newsApi.list, {
        apiKey: key,
        now: later(),
        ...filter,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data.map((item) => item.key).sort();
    }

    expect(await keys({ driver: 'lec' })).toEqual(['both', 'ferrari']);
    // A story naming two teams' drivers belongs to neither team.
    expect(await keys({ team: 'mercedes' })).toEqual(['mercedes']);
    expect(await keys({ race: 'test-2026' })).toEqual([
      'both',
      'ferrari',
      'mercedes',
    ]);
    expect(
      await t.query(internal.newsApi.list, {
        apiKey: key,
        now: later(),
        race: 'nowhere-2026',
      }),
    ).toEqual({ ok: false, error: 'unknown_race' });
  });
});

describe('news API change feed', () => {
  it('reports a correction and a retraction to a reader holding a cursor', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, story('kept'));
    await t.mutation(internal.raceNews.publish, story('withdrawn'));

    const first = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
      updatedSince: 0,
    });
    if (!first.ok) {
      throw new Error(first.error);
    }
    expect(first.data.map((item) => item.key).sort()).toEqual([
      'kept',
      'withdrawn',
    ]);
    // Always set, so the reader can resume from here.
    expect(first.nextCursor).not.toBeNull();

    const idle = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
      updatedSince: 0,
      cursor: first.nextCursor!,
    });
    expect(idle).toMatchObject({ ok: true, data: [], hasMore: false });

    // Stamps past the cursor, as a real later write would carry.
    const future = Date.now() + 10_000;
    await t.mutation(internal.raceNews.retract, {
      raceSlug: 'test-2026',
      key: 'withdrawn',
    });
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query('raceNews').collect()) {
        await ctx.db.patch(row._id, {
          updatedAt: future,
          ...(row.key === 'kept' ? { headline: 'Corrected headline' } : {}),
        });
      }
    });

    const next = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
      updatedSince: 0,
      cursor: first.nextCursor!,
    });
    if (!next.ok) {
      throw new Error(next.error);
    }
    expect(next.data).toHaveLength(2);
    expect(next.data.find((item) => item.key === 'kept')).toMatchObject({
      status: 'published',
      headline: 'Corrected headline',
    });
    // A retraction is a tombstone: the withdrawn text is not served again.
    const tombstone = next.data.find((item) => item.key === 'withdrawn');
    expect(tombstone).toEqual({
      id: tombstone!.id,
      key: 'withdrawn',
      status: 'retracted',
      updatedAt: new Date(future).toISOString(),
    });

    // The live list drops it.
    const live = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
    });
    expect(live.ok && live.data.map((item) => item.key)).toEqual(['kept']);
  });

  it('holds back a change that has not settled', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, story('fresh'));

    const early = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: Date.now(),
      updatedSince: 0,
    });
    expect(early).toMatchObject({ ok: true, data: [] });
    const settled = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
      updatedSince: 0,
    });
    expect(settled.ok && settled.data.map((item) => item.key)).toEqual([
      'fresh',
    ]);
  });

  it('reads a change-feed cursor as the change feed, with or without updated_since', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, story('first'));
    const first = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
      updatedSince: 0,
    });
    if (!first.ok) {
      throw new Error(first.error);
    }
    await t.mutation(internal.raceNews.retract, {
      raceSlug: 'test-2026',
      key: 'first',
    });
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query('raceNews').collect()) {
        await ctx.db.patch(row._id, { updatedAt: Date.now() + 10_000 });
      }
    });
    // No updated_since: the cursor alone says this is the change feed, so the
    // retraction is reported rather than the cursor refused.
    const next = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
      cursor: first.nextCursor!,
    });
    expect(next).toMatchObject({
      ok: true,
      data: [{ key: 'first', status: 'retracted' }],
    });

    expect(decodeCursor(encodeCursor('changes', { t: 5, seen: [] }))).toEqual({
      mode: 'changes',
      position: { t: 5, seen: [] },
    });
    for (const cursor of ['not-a-cursor', btoa('{"m":"p"}')]) {
      expect(
        await t.query(internal.newsApi.list, {
          apiKey: key,
          now: later(),
          cursor,
        }),
      ).toEqual({ ok: false, error: 'invalid_cursor' });
    }
  });
});

describe('news API topics', () => {
  it('publishes, keeps, serves and filters a topic', async () => {
    const { t, key } = await setup();
    const rehearsal = await t.mutation(internal.raceNews.publish, {
      ...story('penalised', ['ANT']),
      topic: 'penalty',
      dryRun: true,
    });
    expect(rehearsal).toMatchObject({ dryRun: true, topic: 'penalty' });

    await t.mutation(internal.raceNews.publish, {
      ...story('penalised', ['ANT']),
      topic: 'penalty',
    });
    // A correction that leaves the topic out keeps it.
    await t.mutation(internal.raceNews.publish, {
      ...story('penalised', ['ANT']),
      headline: 'Antonelli drops ten places',
    });
    await t.mutation(internal.raceNews.publish, story('untagged'));
    await t.mutation(internal.globalNews.publish, {
      key: 'season-calendar',
      headline: 'The 2027 calendar is out',
      body: 'Twenty-four rounds, starting in Melbourne.',
      topic: 'calendar',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/calendar',
    });
    await t.mutation(internal.globalNews.publish, {
      key: 'season-calendar',
      headline: 'The 2027 calendar is out',
      body: 'Twenty-four rounds, starting in Melbourne. Corrected.',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/calendar',
    });

    const all = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
    });
    if (!all.ok) {
      throw new Error(all.error);
    }
    const topics = Object.fromEntries(
      all.data.map((item) => [
        item.key,
        item.status === 'published' ? item.topic : undefined,
      ]),
    );
    expect(topics).toEqual({
      penalised: 'penalty',
      untagged: null,
      'season-calendar': 'calendar',
    });

    const penalties = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: later(),
      topic: 'penalty',
    });
    expect(penalties.ok && penalties.data.map((item) => item.key)).toEqual([
      'penalised',
    ]);
  });

  it('refuses a topic that is not on the list', async () => {
    const { t } = await setup();
    await expect(
      t.mutation(internal.raceNews.publish, {
        ...story('bad'),
        topic: 'gossip',
        dryRun: true,
      }),
    ).rejects.toThrow('Unknown topic "gossip"');
    const global = await t.mutation(internal.globalNews.publish, {
      key: 'bad-topic',
      headline: 'A headline',
      body: 'A body that is long enough.',
      topic: 'gossip',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/bad',
      dryRun: true,
    });
    expect(global).toMatchObject({ valid: false, topic: 'gossip' });
  });

  it('backfills topics by id as a dry run unless told otherwise, leaving updatedAt alone', async () => {
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, story('old-story'));
    const before = await t.run(async (ctx) => ctx.db.query('raceNews').first());
    const items = [
      { id: before!._id, topic: 'weather' },
      { id: 'nope', topic: 'weather' },
    ];

    const rehearsal = await t.mutation(internal.newsApi.backfillTopics, {
      items,
    });
    expect(rehearsal).toEqual({
      dryRun: true,
      results: [
        {
          id: before!._id,
          key: 'old-story',
          from: null,
          to: 'weather',
          outcome: 'would_set',
        },
        {
          id: 'nope',
          key: null,
          from: null,
          to: 'weather',
          outcome: 'not_found',
        },
      ],
    });
    expect((await t.run((ctx) => ctx.db.get(before!._id)))?.topic).toBe(
      undefined,
    );

    const applied = await t.mutation(internal.newsApi.backfillTopics, {
      items: [
        { id: before!._id, topic: 'weather' },
        { id: before!._id, topic: 'gossip' },
      ],
      dryRun: false,
    });
    expect(applied.results.map((result) => result.outcome)).toEqual([
      'set',
      'unknown_topic',
    ]);
    const after = await t.run((ctx) => ctx.db.get(before!._id));
    expect(after).toMatchObject({
      topic: 'weather',
      updatedAt: before!.updatedAt,
    });
  });
});

describe('news API season and date filters', () => {
  async function seeded() {
    const { t, key } = await setup();
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('races', {
        season: 2027,
        round: 1,
        name: 'Next Grand Prix',
        slug: 'next-2027',
        raceStartAt: now + 400 * 24 * HOUR,
        predictionLockAt: now + 400 * 24 * HOUR,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
    });
    await t.mutation(internal.raceNews.publish, story('this-season'));
    await t.mutation(
      internal.raceNews.publish,
      story('next-season', undefined, 'next-2027'),
    );
    await t.mutation(internal.globalNews.publish, {
      key: 'paddock-story',
      headline: 'A story about no race',
      body: 'Something about the sport as a whole.',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/paddock',
    });
    // Fixed publish times, so the windows below are exact.
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query('raceNews').collect()) {
        await ctx.db.patch(row._id, {
          publishedAt:
            row.key === 'this-season'
              ? Date.UTC(2026, 8, 1)
              : Date.UTC(2026, 10, 1),
        });
      }
      for (const row of await ctx.db.query('globalNews').collect()) {
        await ctx.db.patch(row._id, { publishedAt: Date.UTC(2026, 9, 1) });
      }
    });
    async function keys(filter: {
      season?: number;
      publishedAfter?: number;
      publishedBefore?: number;
      updatedSince?: number;
    }) {
      const result = await t.query(internal.newsApi.list, {
        apiKey: key,
        now: later(),
        ...filter,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data.map((item) => item.key).sort();
    }
    return { keys };
  }

  it('reads a season by its races, and a race-independent story by the year it was published', async () => {
    const { keys } = await seeded();
    expect(await keys({ season: 2026 })).toEqual([
      'paddock-story',
      'this-season',
    ]);
    expect(await keys({ season: 2027 })).toEqual(['next-season']);
    expect(await keys({ season: 2027, updatedSince: 0 })).toEqual([
      'next-season',
    ]);
  });

  it('bounds publishedAt, after inclusive and before exclusive, in both orders', async () => {
    const { keys } = await seeded();
    const window = {
      publishedAfter: Date.UTC(2026, 9, 1),
      publishedBefore: Date.UTC(2026, 10, 1),
    };
    expect(await keys(window)).toEqual(['paddock-story']);
    expect(await keys({ ...window, updatedSince: 0 })).toEqual([
      'paddock-story',
    ]);
    expect(await keys({ publishedAfter: Date.UTC(2026, 9, 1) })).toEqual([
      'next-season',
      'paddock-story',
    ]);
  });
});

describe('news API story links', () => {
  async function onWriteUp(status: 'upcoming' | 'finished') {
    const { t, key } = await setup();
    await t.run(async (ctx) => {
      const now = Date.now();
      // A race with a write-up in `packages/shared/src/raceWriteups.ts`.
      await ctx.db.insert('races', {
        season: 2026,
        round: 2,
        name: 'Madrid Grand Prix',
        slug: 'madrid-2026',
        raceStartAt: now + 48 * HOUR,
        predictionLockAt: now + 48 * HOUR,
        status,
        createdAt: now,
        updatedAt: now,
      });
    });
    await t.mutation(
      internal.raceNews.publish,
      story('on-the-page', undefined, 'madrid-2026'),
    );
    await t.mutation(internal.raceNews.publish, {
      ...story('feed-only', undefined, 'madrid-2026'),
      writeUpSelected: false,
    });
    await t.mutation(internal.raceNews.publish, story('no-write-up'));
    const result = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: Date.now() + HOUR,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    return Object.fromEntries(
      result.data.map((item) => [
        item.key,
        item.status === 'published' ? item.url : undefined,
      ]),
    );
  }

  it('links a story to its card on a live write-up, and nothing else', async () => {
    expect(await onWriteUp('upcoming')).toEqual({
      'on-the-page':
        'https://grandprixpicks.com/f1-2026-madrid-grand-prix-predictions#news-on-the-page',
      'feed-only': null,
      'no-write-up': null,
    });
  });

  it('drops the link once the write-up stops showing the weekend news', async () => {
    expect(await onWriteUp('finished')).toEqual({
      'on-the-page': null,
      'feed-only': null,
      'no-write-up': null,
    });
  });
});

describe('news API plans', () => {
  it('shows a free key every story a day late, in the list, get and the change feed', async () => {
    const { t, key } = await setup('free');
    await t.mutation(internal.raceNews.publish, story('fresh'));
    const now = Date.now() + HOUR;
    const dayLater = Date.now() + 25 * HOUR;

    const live = await t.query(internal.newsApi.list, { apiKey: key, now });
    expect(live).toMatchObject({ ok: true, data: [] });
    const changes = await t.query(internal.newsApi.list, {
      apiKey: key,
      now,
      updatedSince: 0,
    });
    expect(changes).toMatchObject({ ok: true, data: [] });

    const id = await t.run(
      async (ctx) => (await ctx.db.query('raceNews').first())!._id,
    );
    expect(
      await t.query(internal.newsApi.get, { apiKey: key, id, now }),
    ).toEqual({
      ok: false,
      error: 'not_found',
    });

    const late = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: dayLater,
    });
    expect(late.ok && late.data.map((item) => item.key)).toEqual(['fresh']);
    const lateChanges = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: dayLater,
      updatedSince: 0,
    });
    expect(lateChanges.ok && lateChanges.data.map((item) => item.key)).toEqual([
      'fresh',
    ]);
    expect(
      await t.query(internal.newsApi.get, { apiKey: key, id, now: dayLater }),
    ).toMatchObject({ ok: true, data: { key: 'fresh' } });
  });

  it('lists a key with its plan, moves it, and counts an old key as commercial', async () => {
    const { t } = await setup('hobby');
    const [listed] = await t.query(internal.newsApi.listKeys, {});
    expect(listed).toMatchObject({ plan: 'hobby' });
    expect(
      await t.mutation(internal.newsApi.setKeyPlan, {
        id: listed!.id,
        plan: 'free',
      }),
    ).toEqual({ label: 'test', from: 'hobby', to: 'free' });

    await t.run(async (ctx) => {
      await ctx.db.insert('newsApiKeys', {
        label: 'before plans',
        keyHash: 'x'.repeat(64),
        prefix: 'gpp_old',
        createdAt: 0,
      });
    });
    const keys = await t.query(internal.newsApi.listKeys, {});
    expect(keys.map((row) => [row.label, row.plan])).toEqual(
      expect.arrayContaining([
        ['test', 'free'],
        ['before plans', 'commercial'],
      ]),
    );
  });
});

describe('news API reference lists', () => {
  it('lists races in calendar order and drivers by code, for a key only', async () => {
    const { t, key } = await setup();
    const races = await t.query(internal.newsApi.races, { apiKey: key });
    expect(races).toMatchObject({
      ok: true,
      data: [{ slug: 'test-2026', name: 'Test Grand Prix', season: 2026 }],
    });
    expect(
      await t.query(internal.newsApi.races, { apiKey: key, season: 2030 }),
    ).toEqual({ ok: true, data: [] });
    const drivers = await t.query(internal.newsApi.drivers, { apiKey: key });
    expect(drivers.ok && drivers.data.map((driver) => driver.code)).toEqual([
      'ANT',
      'LEC',
      'RUS',
    ]);
    expect(
      await t.query(internal.newsApi.drivers, { apiKey: 'gpp_nope' }),
    ).toEqual({
      ok: false,
      error: 'unauthorized',
    });
  });
});

describe('news API sample', () => {
  it('serves a page in the live shape', async () => {
    // `sample` answers through the list's own validator, which convex-test
    // checks: a field added to the item and not to the sample fails here.
    const { t } = await setup();
    const page = await t.query(api.newsApi.sample, {});
    expect(page.data.length).toBeGreaterThanOrEqual(2);
    expect(page.hasMore).toBe(false);
    // Newest published first, as the list orders them.
    const published = page.data.map((item) =>
      item.status === 'published' ? item.publishedAt : '',
    );
    expect(published).toEqual([...published].sort().reverse());
  });
});

describe('news API waiting list', () => {
  it('stores an address once, whatever its casing, with what they would build', async () => {
    const { t } = await setup();
    await t.mutation(api.newsApi.joinWaitlist, { email: ' Dev@Example.com ' });
    await t.mutation(api.newsApi.joinWaitlist, {
      email: 'dev@example.com',
      useCase: 'A Discord bot',
      use: 'personal',
    });
    // A blank second answer does not erase the first.
    await t.mutation(api.newsApi.joinWaitlist, { email: 'dev@example.com' });
    const waiting = await t.query(internal.newsApi.listWaitlist, {});
    expect(waiting).toHaveLength(1);
    expect(waiting[0]).toMatchObject({
      email: 'dev@example.com',
      useCase: 'A Discord bot',
      use: 'personal',
    });
    await expect(
      t.mutation(api.newsApi.joinWaitlist, { email: 'not an address' }),
    ).rejects.toThrow('Enter a valid email address.');
    await expect(
      t.mutation(api.newsApi.joinWaitlist, {
        email: 'dev@example.com',
        useCase: 'x'.repeat(1001),
      }),
    ).rejects.toThrow("Keep what you'd build to 1,000 characters.");
  });
});

describe('news API metering', () => {
  it('counts served requests per key per day and refuses past the plan limit', async () => {
    const { t, key } = await setup('free');
    expect(
      await t.mutation(internal.newsApi.recordRequest, { apiKey: 'gpp_nope' }),
    ).toEqual({ ok: false, error: 'unauthorized' });

    for (let request = 0; request < 10; request += 1) {
      const served = await t.mutation(internal.newsApi.recordRequest, {
        apiKey: key,
      });
      expect(served).toMatchObject({
        ok: true,
        quota: { limit: 10, remaining: 9 - request },
      });
    }
    const refused = await t.mutation(internal.newsApi.recordRequest, {
      apiKey: key,
    });
    expect(refused).toMatchObject({
      ok: false,
      error: 'rate_limited',
      quota: { limit: 10, remaining: 0 },
    });
    if (refused.ok || refused.error !== 'rate_limited') {
      throw new Error('expected a refusal');
    }
    expect(refused.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    // All ten back takes about the whole minute.
    expect(refused.quota.resetSeconds).toBeGreaterThan(50);
    expect(refused.quota.resetSeconds).toBeLessThanOrEqual(60);

    // A refused request is not counted.
    expect(await t.query(internal.newsApi.usage, {})).toEqual([
      {
        day: new Date().toISOString().slice(0, 10),
        label: 'test',
        requests: 10,
      },
    ]);
  });

  it('gives each plan its own limit', async () => {
    for (const [plan, limit] of [
      ['hobby', 60],
      ['commercial', 300],
    ] as const) {
      const { t, key } = await setup(plan);
      expect(
        await t.mutation(internal.newsApi.recordRequest, { apiKey: key }),
      ).toMatchObject({ ok: true, quota: { limit, remaining: limit - 1 } });
    }
  });
});

describe('news API waiting list abuse', () => {
  it('fills a blank answer but never replaces one', async () => {
    const { t } = await setup();
    await t.mutation(api.newsApi.joinWaitlist, {
      email: 'dev@example.com',
      useCase: 'A Discord bot',
    });
    await t.mutation(api.newsApi.joinWaitlist, {
      email: 'dev@example.com',
      useCase: 'Something rude',
      use: 'commercial',
    });

    const [entry] = await t.query(internal.newsApi.listWaitlist, {});
    expect(entry).toMatchObject({
      useCase: 'A Discord bot',
      use: 'commercial',
    });
  });

  it('limits one address without locking out everyone else', async () => {
    const { t } = await setup();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await t.mutation(api.newsApi.joinWaitlist, { email: 'spam@example.com' });
    }
    await expect(
      t.mutation(api.newsApi.joinWaitlist, { email: 'spam@example.com' }),
    ).rejects.toThrow('Too many requests.');

    await t.mutation(api.newsApi.joinWaitlist, { email: 'fan@example.com' });
    expect(await t.query(internal.newsApi.listWaitlist, {})).toHaveLength(2);
  });
});

describe('news API serving', () => {
  it('counts every read and reads on the server clock', async () => {
    const { t, key } = await setup('free');
    await t.mutation(internal.raceNews.publish, story('first'));

    const served = await t.action(api.newsApiServe.list, { apiKey: key });
    expect(served.meter).toMatchObject({ ok: true, quota: { remaining: 9 } });
    // The free plan reads late, so a story published a moment ago is not
    // in it: the caller can no longer pass a later moment to see it.
    expect(served.result).toMatchObject({ ok: true, data: [] });

    await t.action(api.newsApiServe.drivers, { apiKey: key });
    expect(await t.query(internal.newsApi.usage, {})).toEqual([
      expect.objectContaining({ label: 'test', requests: 2 }),
    ]);
  });

  it('refuses an unknown key at the meter', async () => {
    const { t } = await setup();
    const served = await t.action(api.newsApiServe.get, {
      apiKey: 'gpp_nope',
      id: 'anything',
    });
    expect(served.meter).toEqual({ ok: false, error: 'unauthorized' });
  });
});
