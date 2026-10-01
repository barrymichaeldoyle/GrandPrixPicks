import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { MutationCtx } from './_generated/server';
import type { Id, Doc } from './_generated/dataModel';
import { internalAction, internalMutation, query } from './_generated/server';
import {
  officialVideoMetadata,
  raceVideoKind,
  validateVideoId,
} from './lib/raceVideos';
import schema from './schema';
import { fetchWithTimeout } from './lib/fetchWithTimeout';

/** One reviewed official video per race/session; replacing it updates every surface. */
export const list = query({
  args: { raceSlug: v.string() },
  returns: v.array(schema.doc('raceVideos')),
  handler: async (ctx, { raceSlug }) => {
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', raceSlug))
      .unique();
    if (!race) {
      return [];
    }
    return await ctx.db
      .query('raceVideos')
      .withIndex('by_race_kind', (q) => q.eq('raceId', race._id))
      .take(8);
  },
});

/** Operator entry point. Verify channel ownership before publishing a selected link. */
export const attach = internalAction({
  args: { raceSlug: v.string(), kind: raceVideoKind, videoId: v.string() },
  returns: v.id('raceVideos'),
  handler: async (
    ctx,
    args,
  ): Promise<import('./_generated/dataModel').Id<'raceVideos'>> => {
    validateVideoId(args.videoId);
    const endpoint = new URL('https://www.youtube.com/oembed');
    endpoint.searchParams.set(
      'url',
      `https://www.youtube.com/watch?v=${args.videoId}`,
    );
    endpoint.searchParams.set('format', 'json');
    const response = await fetchWithTimeout(endpoint, {
      redirect: 'error',
    });
    if (!response.ok) {
      throw new Error(`YouTube metadata request failed (${response.status})`);
    }
    const { title } = officialVideoMetadata(await response.json());
    return await ctx.runMutation(internal.raceVideos.upsert, {
      ...args,
      title,
    });
  },
});

export const upsert = internalMutation({
  args: {
    raceSlug: v.string(),
    kind: raceVideoKind,
    videoId: v.string(),
    title: v.string(),
  },
  returns: v.id('raceVideos'),
  handler: upsertRaceVideo,
});

export const remove = internalMutation({
  args: { raceSlug: v.string(), kind: raceVideoKind },
  returns: v.null(),
  handler: async (ctx, { raceSlug, kind }) => {
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', raceSlug))
      .unique();
    if (!race) {
      throw new Error('Race not found');
    }
    const video = await ctx.db
      .query('raceVideos')
      .withIndex('by_race_kind', (q) =>
        q.eq('raceId', race._id).eq('kind', kind),
      )
      .unique();
    if (video) {
      await ctx.db.delete('raceVideos', video._id);
    }
    return null;
  },
});

export async function upsertRaceVideo(
  ctx: MutationCtx,
  {
    raceSlug,
    ...video
  }: {
    raceSlug: string;
    kind: Doc<'raceVideos'>['kind'];
    videoId: string;
    title: string;
  },
): Promise<Id<'raceVideos'>> {
  validateVideoId(video.videoId);
  if (!video.title.trim() || video.title.length > 300) {
    throw new Error('Invalid video title');
  }
  const race = await ctx.db
    .query('races')
    .withIndex('by_slug', (q) => q.eq('slug', raceSlug))
    .unique();
  if (!race) {
    throw new Error('Race not found');
  }
  if (
    !race.hasSprint &&
    (video.kind === 'sprint' || video.kind === 'sprint_quali')
  ) {
    throw new Error('Race has no sprint session');
  }
  if (race.hasSprint && (video.kind === 'fp2' || video.kind === 'fp3')) {
    throw new Error('Sprint weekends have no FP2 or FP3');
  }
  const existing = await ctx.db
    .query('raceVideos')
    .withIndex('by_race_kind', (q) =>
      q.eq('raceId', race._id).eq('kind', video.kind),
    )
    .unique();
  const fields = { ...video, raceId: race._id, updatedAt: Date.now() };
  if (existing) {
    await ctx.db.patch('raceVideos', existing._id, fields);
    return existing._id;
  }
  return await ctx.db.insert('raceVideos', fields);
}
