/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';
import {
  F1_CHANNEL,
  matchUpload,
  parseUploads,
  validSignature,
  YOUTUBE_TOPIC,
} from './lib/youtube';
import type { Doc } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');
const at = Date.UTC(2026, 8, 25);
const upload = {
  videoId: '7QC7-5jWriI',
  title: 'FP2 Highlights | 2026 Azerbaijan Grand Prix',
  publishedAt: at,
  sourceUpdatedAt: at,
};
const secret = 'test-secret-for-youtube-websub-123456789';
function xml(channel = F1_CHANNEL) {
  return `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>${upload.videoId}</yt:videoId><yt:channelId>${channel}</yt:channelId><title>${upload.title}</title><published>${new Date(at).toISOString()}</published><updated>${new Date(at).toISOString()}</updated></entry></feed>`;
}
async function signed(body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  return (
    'sha1=' +
    Array.from(
      new Uint8Array(
        await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)),
      ),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('')
  );
}
async function setup() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert('races', {
      season: 2026,
      round: 15,
      name: 'Azerbaijan Grand Prix',
      slug: 'azerbaijan-2026',
      raceStartAt: at + 2 * 86400000,
      predictionLockAt: at,
      status: 'upcoming',
      createdAt: at,
      updatedAt: at,
    }),
  );
  return t;
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('YouTube uploads', () => {
  it('accepts Atom namespaces and rejects foreign channels and unsafe XML', () => {
    expect(parseUploads(xml())).toEqual([upload]);
    expect(() => parseUploads(xml('other-channel'))).toThrow('Invalid upload');
    expect(() => parseUploads('<!DOCTYPE feed>' + xml())).toThrow('Unsafe XML');
    expect(() => parseUploads(xml().slice(0, -5))).toThrow();
  });
  it('verifies signatures over the exact bytes', async () => {
    const bytes = new TextEncoder().encode(xml());
    const signature = await signed(xml());
    expect(await validSignature(secret, signature, bytes)).toBe(true);
    expect(
      await validSignature(
        secret,
        signature,
        new TextEncoder().encode(xml() + ' '),
      ),
    ).toBe(false);
    expect(await validSignature(secret, null, bytes)).toBe(false);
  });
  it('matches session and year, avoiding history, ambiguous years and sprint mismatches', async () => {
    const t = await setup();
    const races = await t.run((ctx) => ctx.db.query('races').take(1));
    expect(matchUpload(upload, races)).toEqual({
      raceSlug: 'azerbaijan-2026',
      kind: 'fp2',
    });
    expect(
      matchUpload(
        { ...upload, title: 'FP2 Highlights | Azerbaijan Grand Prix' },
        races,
      ),
    ).toEqual({ raceSlug: 'azerbaijan-2026', kind: 'fp2' });
    expect(
      matchUpload(
        {
          ...upload,
          title: 'FP2 Highlights | Azerbaijan Grand Prix',
          publishedAt: upload.publishedAt + 30 * 86400000,
        },
        races,
      ),
    ).toBe('Race needs review');
    expect(
      matchUpload(
        {
          ...upload,
          title: 'FP2 Highlights | 2025 vs 2026 Azerbaijan Grand Prix',
        },
        races,
      ),
    ).toBe('Race year needs review');
    expect(
      matchUpload(
        { ...upload, title: 'FP2 Highlights | 2025 Azerbaijan Grand Prix' },
        races,
      ),
    ).toBe('Race needs review');
    expect(
      matchUpload(
        { ...upload, title: 'F2 Race Highlights | 2026 Azerbaijan Grand Prix' },
        races,
      ),
    ).toBe('Unsupported or historical video');
    expect(
      matchUpload(upload, [{ ...races[0]!, hasSprint: true } as Doc<'races'>]),
    ).toBe('Session does not belong to this weekend');
  });
  it('deduplicates deliveries, publishes verified matches, and retracts invalidated matches', async () => {
    const t = await setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              author_url: 'https://www.youtube.com/@Formula1',
              title: upload.title,
            }),
          ),
        ),
      ),
    );
    await t.mutation(internal.youtubeUploads.ingest, {
      uploads: [upload, upload],
    });
    const rows = await t.run((ctx) => ctx.db.query('youtubeUploads').take(2));
    expect(rows).toHaveLength(1);
    await t.action(internal.youtubeUploads.process, { id: rows[0]!._id });
    expect(
      await t.query(api.raceVideos.list, { raceSlug: 'azerbaijan-2026' }),
    ).toHaveLength(1);
    await t.mutation(internal.youtubeUploads.ingest, {
      uploads: [{ ...upload, sourceUpdatedAt: at + 1 }],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              author_url: 'https://www.youtube.com/@Formula1',
              title: 'FP2 Highlights | 2025 Azerbaijan Grand Prix',
            }),
          ),
        ),
      ),
    );
    await t.action(internal.youtubeUploads.process, { id: rows[0]!._id });
    expect(
      await t.query(api.raceVideos.list, { raceSlug: 'azerbaijan-2026' }),
    ).toEqual([]);
    expect((await t.run((ctx) => ctx.db.get(rows[0]!._id)))?.status).toBe(
      'review',
    );
    await expect(t.query(api.youtubeUploads.reviewQueue, {})).rejects.toThrow();
    await expect(
      t.mutation(api.youtubeUploads.review, {
        id: rows[0]!._id,
        version: at + 1,
        decision: 'reject',
      }),
    ).rejects.toThrow();
  });
  it('checks requested subscription challenges and rejects unsigned deliveries', async () => {
    vi.stubEnv('YOUTUBE_WEBSUB_SECRET', secret);
    const t = await setup();
    await t.mutation(internal.youtubeUploads.requestSubscription, {
      verifyToken: 'token',
    });
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.topic': YOUTUBE_TOPIC,
      'hub.challenge': 'challenge',
      'hub.lease_seconds': '432000',
      token: 'token',
    });
    expect((await t.fetch('/youtube-websub?' + params)).status).toBe(200);
    params.set('token', 'wrong');
    expect((await t.fetch('/youtube-websub?' + params)).status).toBe(403);
    expect(
      (await t.fetch('/youtube-websub', { method: 'POST', body: xml() }))
        .status,
    ).toBe(403);
    expect(
      (
        await t.fetch('/youtube-websub', {
          method: 'POST',
          headers: { 'x-hub-signature': await signed(xml()) },
          body: xml(),
        })
      ).status,
    ).toBe(204);
  });

  it('lets admins publish verified reviews and preserves rejections through updates', async () => {
    const t = await setup();
    await t.run((ctx) =>
      ctx.db.insert('users', {
        clerkUserId: 'admin',
        isAdmin: true,
        createdAt: at,
        updatedAt: at,
      }),
    );
    await t.mutation(internal.youtubeUploads.ingest, { uploads: [upload] });
    const [row] = await t.run((ctx) => ctx.db.query('youtubeUploads').take(1));
    await t.mutation(internal.youtubeUploads.complete, {
      id: row!._id,
      version: at,
      status: 'review',
      reason: 'Year needs review',
      title: 'FP2 highlights',
    });
    const admin = t.withIdentity({ subject: 'admin' });
    await expect(
      admin.mutation(api.youtubeUploads.review, {
        id: row!._id,
        version: at - 1,
        decision: 'publish',
        raceSlug: 'azerbaijan-2026',
        kind: 'fp2',
      }),
    ).rejects.toThrow('Upload changed');
    await admin.mutation(api.youtubeUploads.review, {
      id: row!._id,
      version: at,
      decision: 'publish',
      raceSlug: 'azerbaijan-2026',
      kind: 'fp2',
    });
    expect(
      await t.query(api.raceVideos.list, { raceSlug: 'azerbaijan-2026' }),
    ).toHaveLength(1);
    expect(
      (await t.run((ctx) => ctx.db.get(row!._id)))?.reviewedBy,
    ).toBeDefined();
    const second = { ...upload, videoId: '8Vq9dmysOmA' };
    await t.mutation(internal.youtubeUploads.ingest, { uploads: [second] });
    const rejected = await t.run((ctx) =>
      ctx.db
        .query('youtubeUploads')
        .withIndex('by_videoId', (q) => q.eq('videoId', second.videoId))
        .unique(),
    );
    await t.mutation(internal.youtubeUploads.complete, {
      id: rejected!._id,
      version: at,
      status: 'review',
      reason: 'Race needs review',
      title: 'Radio Rewind',
    });
    await admin.mutation(api.youtubeUploads.review, {
      id: rejected!._id,
      version: at,
      decision: 'reject',
    });
    await t.mutation(internal.youtubeUploads.ingest, {
      uploads: [{ ...second, sourceUpdatedAt: at + 2 }],
    });
    expect((await t.run((ctx) => ctx.db.get(rejected!._id)))?.status).toBe(
      'rejected',
    );
  });
});
