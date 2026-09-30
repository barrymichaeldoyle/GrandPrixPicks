/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';
import { officialVideoMetadata } from './lib/raceVideos';

const modules = import.meta.glob('./**/*.ts');
afterEach(() => vi.unstubAllGlobals());

async function setup(hasSprint = false) {
  const t = convexTest(schema, modules);
  const raceId = await t.run((ctx) =>
    ctx.db.insert('races', {
      season: 2026,
      round: 14,
      name: 'Spanish Grand Prix',
      slug: 'madrid-2026',
      raceStartAt: 2000,
      predictionLockAt: 1000,
      status: 'upcoming',
      hasSprint,
      createdAt: 100,
      updatedAt: 100,
    }),
  );
  return { t, raceId };
}

describe('official race videos', () => {
  it('verifies the channel before publishing and rejects lookalikes', async () => {
    const { t } = await setup();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          author_url: 'https://www.youtube.com/@Formula1',
          title: 'FP2 highlights',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    await t.action(internal.raceVideos.attach, {
      raceSlug: 'madrid-2026',
      kind: 'fp2',
      videoId: '7QC7-5jWriI',
    });
    expect(
      (await t.query(api.raceVideos.list, { raceSlug: 'madrid-2026' }))[0]
        ?.title,
    ).toBe('FP2 highlights');
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      'https://www.youtube.com/oembed?',
    );
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify({
          author_name: 'FORMULA 1',
          author_url: 'https://www.youtube.com/@Formula1Fake',
          title: 'Fake',
        }),
      ),
    );
    await expect(
      t.action(internal.raceVideos.attach, {
        raceSlug: 'madrid-2026',
        kind: 'fp1',
        videoId: '8Vq9dmysOmA',
      }),
    ).rejects.toThrow('official FORMULA 1');
    expect(
      await t.query(api.raceVideos.list, { raceSlug: 'madrid-2026' }),
    ).toHaveLength(1);
    expect(() => officialVideoMetadata(null)).toThrow(
      'Invalid YouTube metadata',
    );
  });

  it('attaches a late upload to its session, replaces it once, and retracts it everywhere', async () => {
    const { t, raceId } = await setup();
    await t.run((ctx) =>
      ctx.db.insert('practiceResults', {
        raceId,
        sessionType: 'fp2',
        openF1SessionKey: 1,
        entries: [],
        publishedAt: 100,
        updatedAt: 100,
      }),
    );
    function read() {
      return t.query(api.practiceResults.getPracticeResultsForRace, { raceId });
    }
    expect((await read())[0]).not.toHaveProperty('highlightsVideoId');
    const args = {
      raceSlug: 'madrid-2026',
      kind: 'fp2' as const,
      videoId: '7QC7-5jWriI',
      title: 'FP2 highlights',
    };
    const id = await t.mutation(internal.raceVideos.upsert, args);
    expect((await read())[0]?.highlightsVideoId).toBe(args.videoId);
    expect(
      await t.mutation(internal.raceVideos.upsert, {
        ...args,
        videoId: '8Vq9dmysOmA',
      }),
    ).toBe(id);
    expect(
      await t.query(api.raceVideos.list, { raceSlug: args.raceSlug }),
    ).toHaveLength(1);
    expect((await read())[0]?.highlightsVideoId).toBe('8Vq9dmysOmA');
    await t.mutation(internal.raceVideos.remove, {
      raceSlug: args.raceSlug,
      kind: args.kind,
    });
    expect(
      await t.query(api.raceVideos.list, { raceSlug: args.raceSlug }),
    ).toEqual([]);
    expect((await read())[0]).not.toHaveProperty('highlightsVideoId');
    expect(await t.run((ctx) => ctx.db.query('feedEvents').take(1))).toEqual(
      [],
    );
  });

  it('keeps competitive highlights scoped to the result session', async () => {
    const { t, raceId } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'quali',
        classification: [],
        publishedAt: 1,
        updatedAt: 1,
      });
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'race',
        classification: [],
        publishedAt: 2,
        updatedAt: 2,
      });
    });
    await t.mutation(internal.raceVideos.upsert, {
      raceSlug: 'madrid-2026',
      kind: 'quali',
      videoId: '7QC7-5jWriI',
      title: 'Qualifying highlights',
    });
    expect(
      (
        await t.query(api.results.getResultForRace, {
          raceId,
          sessionType: 'quali',
        })
      )?.highlightsVideoId,
    ).toBe('7QC7-5jWriI');
    expect(
      await t.query(api.results.getResultForRace, {
        raceId,
        sessionType: 'race',
      }),
    ).not.toHaveProperty('highlightsVideoId');
  });

  it('rejects invalid IDs, unknown races and sessions absent from the weekend', async () => {
    const { t } = await setup(true);
    const args = {
      raceSlug: 'madrid-2026',
      kind: 'fp1' as const,
      videoId: '7QC7-5jWriI',
      title: 'Highlights',
    };
    await expect(
      t.mutation(internal.raceVideos.upsert, {
        ...args,
        videoId: 'https://example.com',
      }),
    ).rejects.toThrow('Invalid YouTube');
    await expect(
      t.mutation(internal.raceVideos.upsert, { ...args, raceSlug: 'missing' }),
    ).rejects.toThrow('Race not found');
    await expect(
      t.mutation(internal.raceVideos.upsert, { ...args, kind: 'fp2' }),
    ).rejects.toThrow('no FP2');
    expect(await t.query(api.raceVideos.list, { raceSlug: 'missing' })).toEqual(
      [],
    );
  });
});
