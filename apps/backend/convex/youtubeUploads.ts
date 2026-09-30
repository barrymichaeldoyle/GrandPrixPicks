import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { getViewer, requireAdmin } from './lib/auth';
import {
  boundedBody,
  matchUpload,
  parseUploads,
  YOUTUBE_TOPIC,
} from './lib/youtube';
import {
  officialVideoMetadata,
  raceVideoKind,
  validateVideoId,
} from './lib/raceVideos';
import { upsertRaceVideo } from './raceVideos';
import schema from './schema';

const uploadArgs = {
  videoId: v.string(),
  title: v.string(),
  publishedAt: v.number(),
  sourceUpdatedAt: v.number(),
};

export const ingest = internalMutation({
  args: { uploads: v.array(v.object(uploadArgs)) },
  returns: v.null(),
  handler: async (ctx, { uploads }) => {
    if (uploads.length > 30) {
      throw new Error('Too many uploads');
    }
    for (const upload of uploads) {
      validateVideoId(upload.videoId);
      if (
        upload.title.length > 300 ||
        !upload.title.trim() ||
        !Number.isFinite(upload.publishedAt) ||
        !Number.isFinite(upload.sourceUpdatedAt)
      ) {
        throw new Error('Invalid upload');
      }
      const existing = await ctx.db
        .query('youtubeUploads')
        .withIndex('by_videoId', (q) => q.eq('videoId', upload.videoId))
        .unique();
      if (
        existing &&
        (existing.status === 'rejected' ||
          existing.sourceUpdatedAt >= upload.sourceUpdatedAt)
      ) {
        continue;
      }
      let id: Id<'youtubeUploads'>;
      if (existing) {
        id = existing._id;
        await ctx.db.patch(id, {
          ...upload,
          status: 'pending',
          verified: false,
          attempts: 0,
          reason: 'Upload updated',
        });
      } else {
        id = await ctx.db.insert('youtubeUploads', {
          ...upload,
          status: 'pending',
          verified: false,
          attempts: 0,
          reason: 'New upload',
        });
      }
      await ctx.scheduler.runAfter(0, internal.youtubeUploads.process, { id });
    }
    return null;
  },
});

export const context = internalQuery({
  args: { id: v.id('youtubeUploads') },
  returns: v.object({
    upload: v.union(schema.doc('youtubeUploads'), v.null()),
    races: v.array(schema.doc('races')),
  }),
  handler: async (ctx, { id }) => {
    const upload = await ctx.db.get(id);
    const year = upload ? new Date(upload.publishedAt).getUTCFullYear() : 0;
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', year))
      .take(30);
    return { upload, races };
  },
});

export const complete = internalMutation({
  args: {
    id: v.id('youtubeUploads'),
    version: v.number(),
    title: v.optional(v.string()),
    reason: v.string(),
    status: v.union(
      v.literal('review'),
      v.literal('ignored'),
      v.literal('published'),
      v.literal('pending'),
    ),
    match: v.optional(v.object({ raceSlug: v.string(), kind: raceVideoKind })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (
      !row ||
      row.status !== 'pending' ||
      row.sourceUpdatedAt !== args.version
    ) {
      return null;
    }
    let status = args.status;
    let reason = args.reason;
    if (args.match) {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', args.match!.raceSlug))
        .unique();
      if (!race) {
        throw new Error('Race not found');
      }
      const current = await ctx.db
        .query('raceVideos')
        .withIndex('by_race_kind', (q) =>
          q.eq('raceId', race._id).eq('kind', args.match!.kind),
        )
        .unique();
      if (current && current.videoId !== row.videoId) {
        status = 'review';
        reason = 'A different video is already attached';
      } else {
        await upsertRaceVideo(ctx, {
          ...args.match,
          videoId: row.videoId,
          title: args.title!,
        });
      }
    }
    // If updated metadata invalidates an earlier association, remove only this video's link.
    if (
      status !== 'pending' &&
      row.raceSlug &&
      row.kind &&
      (status !== 'published' ||
        row.raceSlug !== args.match?.raceSlug ||
        row.kind !== args.match?.kind)
    ) {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', row.raceSlug!))
        .unique();
      const prior = race
        ? await ctx.db
            .query('raceVideos')
            .withIndex('by_race_kind', (q) =>
              q.eq('raceId', race._id).eq('kind', row.kind!),
            )
            .unique()
        : null;
      if (prior?.videoId === row.videoId) {
        await ctx.db.delete(prior._id);
      }
    }
    await ctx.db.patch(row._id, {
      status,
      reason,
      attempts: row.attempts + 1,
      verified: args.title !== undefined,
      ...(args.title ? { title: args.title } : {}),
      ...(status === 'published' && args.match
        ? args.match
        : status !== 'pending'
          ? { raceSlug: undefined, kind: undefined }
          : {}),
    });
    return null;
  },
});

export const process = internalAction({
  args: { id: v.id('youtubeUploads') },
  returns: v.null(),
  handler: async (ctx, { id }): Promise<null> => {
    const { upload, races } = await ctx.runQuery(
      internal.youtubeUploads.context,
      { id },
    );
    if (!upload || upload.status !== 'pending') {
      return null;
    }
    try {
      const url = new URL('https://www.youtube.com/oembed');
      url.searchParams.set(
        'url',
        `https://www.youtube.com/watch?v=${upload.videoId}`,
      );
      url.searchParams.set('format', 'json');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      if (!response.ok) {
        throw new Error(`YouTube lookup failed (${response.status})`);
      }
      const { title } = officialVideoMetadata(
        JSON.parse(new TextDecoder().decode(await boundedBody(response))),
      );
      const match = matchUpload({ ...upload, title }, races);
      const irrelevant =
        !/highlights|radio rewind/i.test(title) ||
        match === 'Unsupported or historical video';
      await ctx.runMutation(internal.youtubeUploads.complete, {
        id,
        version: upload.sourceUpdatedAt,
        title,
        status:
          typeof match === 'string'
            ? irrelevant
              ? 'ignored'
              : 'review'
            : 'published',
        reason: typeof match === 'string' ? match : 'Matched race and session',
        ...(typeof match !== 'string' ? { match } : {}),
      });
    } catch (error) {
      await ctx.runMutation(internal.youtubeUploads.complete, {
        id,
        version: upload.sourceUpdatedAt,
        status: upload.attempts >= 2 ? 'review' : 'pending',
        reason:
          error instanceof Error
            ? error.message.slice(0, 300)
            : 'YouTube lookup failed',
      });
    }
    return null;
  },
});

export const reviewQueue = query({
  args: {},
  returns: v.array(schema.doc('youtubeUploads')),
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    return await ctx.db
      .query('youtubeUploads')
      .withIndex('by_status', (q) => q.eq('status', 'review'))
      .take(50);
  },
});

export const review = mutation({
  args: {
    id: v.id('youtubeUploads'),
    version: v.number(),
    decision: v.union(
      v.literal('publish'),
      v.literal('reject'),
      v.literal('retry'),
    ),
    raceSlug: v.optional(v.string()),
    kind: v.optional(raceVideoKind),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reviewer = await getViewer(ctx);
    requireAdmin(reviewer);
    const row = await ctx.db.get(args.id);
    if (
      !row ||
      row.status !== 'review' ||
      row.sourceUpdatedAt !== args.version
    ) {
      throw new Error('Upload changed; refresh the review');
    }
    if (args.decision === 'publish') {
      if (!row.verified || !args.raceSlug || !args.kind) {
        throw new Error('Verified video, race and session required');
      }
      await upsertRaceVideo(ctx, {
        raceSlug: args.raceSlug,
        kind: args.kind,
        videoId: row.videoId,
        title: row.title,
      });
      await ctx.db.patch(row._id, {
        status: 'published',
        reason: 'Approved by admin',
        raceSlug: args.raceSlug,
        kind: args.kind,
      });
    } else if (args.decision === 'retry') {
      await ctx.db.patch(row._id, { status: 'pending', attempts: 0 });
      await ctx.scheduler.runAfter(0, internal.youtubeUploads.process, {
        id: row._id,
      });
    } else {
      await ctx.db.patch(row._id, {
        status: 'rejected',
        reason: 'Rejected by admin',
      });
    }
    await ctx.db.patch(row._id, {
      reviewedBy: reviewer!._id,
      reviewedAt: Date.now(),
    });
    return null;
  },
});

export const subscriptionStatus = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      requestedAt: v.number(),
      expiresAt: v.number(),
      lastError: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    const row = await ctx.db
      .query('youtubeSubscription')
      .withIndex('by_key', (q) => q.eq('key', 'f1'))
      .unique();
    return row
      ? {
          requestedAt: row.requestedAt,
          expiresAt: row.expiresAt,
          ...(row.lastError ? { lastError: row.lastError } : {}),
        }
      : null;
  },
});

export const subscription = internalQuery({
  args: {},
  returns: v.union(schema.doc('youtubeSubscription'), v.null()),
  handler: async (ctx) =>
    await ctx.db
      .query('youtubeSubscription')
      .withIndex('by_key', (q) => q.eq('key', 'f1'))
      .unique(),
});
export const requestSubscription = internalMutation({
  args: { verifyToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('youtubeSubscription')
      .withIndex('by_key', (q) => q.eq('key', 'f1'))
      .unique();
    const fields = {
      key: 'f1',
      requestedAt: Date.now(),
      verifyToken: args.verifyToken,
      expiresAt: row?.expiresAt ?? 0,
      lastError: undefined,
    };
    if (row) {
      await ctx.db.patch(row._id, fields);
    } else {
      await ctx.db.insert('youtubeSubscription', fields);
    }
    return null;
  },
});
export const confirmSubscription = internalMutation({
  args: { token: v.string(), lease: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('youtubeSubscription')
      .withIndex('by_key', (q) => q.eq('key', 'f1'))
      .unique();
    if (
      !row ||
      args.token !== row.verifyToken ||
      Date.now() - row.requestedAt > 1200000 ||
      !Number.isInteger(args.lease) ||
      args.lease <= 0 ||
      args.lease > 2592000
    ) {
      return false;
    }
    await ctx.db.patch(row._id, {
      expiresAt: Date.now() + args.lease * 1000,
      lastError: undefined,
    });
    return true;
  },
});
export const subscriptionError = internalMutation({
  args: { message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('youtubeSubscription')
      .withIndex('by_key', (q) => q.eq('key', 'f1'))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { lastError: args.message.slice(0, 300) });
    }
    return null;
  },
});
export const renew = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const secret = env.YOUTUBE_WEBSUB_SECRET;
    if (!secret || secret.length < 32) {
      return null;
    }
    const row = await ctx.runQuery(internal.youtubeUploads.subscription, {});
    if (row && row.expiresAt > Date.now() + 86400000) {
      return null;
    }
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(secret),
    );
    const token = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    const callback = `${env.CONVEX_SITE_URL}/youtube-websub?token=${token}`;
    await ctx.runMutation(internal.youtubeUploads.requestSubscription, {
      verifyToken: token,
    });
    try {
      const response = await fetch('https://pubsubhubbub.appspot.com/', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'hub.callback': callback,
          'hub.topic': YOUTUBE_TOPIC,
          'hub.mode': 'subscribe',
          'hub.verify': 'async',
          'hub.lease_seconds': '432000',
          'hub.secret': secret,
        }),
      });
      if (response.status !== 202 && response.status !== 204) {
        throw new Error(
          `YouTube hub refused subscription (${response.status})`,
        );
      }
    } catch (error) {
      await ctx.runMutation(internal.youtubeUploads.subscriptionError, {
        message: error instanceof Error ? error.message : 'Subscription failed',
      });
    }
    return null;
  },
});
export const pending = internalQuery({
  args: {},
  returns: v.array(v.id('youtubeUploads')),
  handler: async (ctx) =>
    (
      await ctx.db
        .query('youtubeUploads')
        .withIndex('by_status', (q) => q.eq('status', 'pending'))
        .take(20)
    ).map((row) => row._id),
});
/** Six-hour safety net for missed uploads, retries and subscription renewal. */
export const reconcile = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    if (!env.YOUTUBE_WEBSUB_SECRET) {
      return null;
    }
    await ctx.runAction(internal.youtubeUploads.renew, {});
    try {
      const response = await fetch(YOUTUBE_TOPIC, {
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      if (!response.ok) {
        throw new Error(`YouTube feed failed (${response.status})`);
      }
      await ctx.runMutation(internal.youtubeUploads.ingest, {
        uploads: parseUploads(
          new TextDecoder().decode(await boundedBody(response)),
        ),
      });
    } catch (error) {
      console.error(
        'YouTube reconciliation:',
        error instanceof Error ? error.message : 'Feed failed',
      );
    }
    for (const id of await ctx.runQuery(internal.youtubeUploads.pending, {})) {
      await ctx.runAction(internal.youtubeUploads.process, { id });
    }
    return null;
  },
});
