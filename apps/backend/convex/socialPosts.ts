import type { SessionType } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';

/**
 * Session results posted to X as @GrandPrixPicks, with no human in the loop.
 *
 * A results post is deterministic: the classification is in `results`, the
 * card is a public URL (`/og/results`), and Buffer takes a plain API call. So
 * it runs here on a cron rather than in a cloud agent session (Barry,
 * 2026-10-23). The news posts stay editorial and go through the operator CLI.
 *
 * One post per race and session, ever. The `socialPosts` row is the guard:
 * it is written before the Buffer call, so an action that dies mid-way
 * leaves a `creating` row that is reported and never retried blind. A result
 * amended while its post is still queued cancels the queued post (the card
 * it carries is stale) and posts the corrected one; a result amended after
 * the post went out is left alone, the way a sent news post is.
 *
 * Env-gated like Discord: without `BUFFER_API_KEY` and
 * `BUFFER_X_CHANNEL_ID` the scan is a no-op, which is what dev wants.
 */

const SITE = 'https://grandprixpicks.com';
const BUFFER_API = 'https://api.buffer.com';
/** How far back a published result is still worth posting. */
const LOOKBACK_MS = 36 * 60 * 60 * 1000;
/**
 * Queue the post a little after detection rather than sharing now. The
 * recheck against the official classification lands in this window for the
 * common corrections, and a queued post can be cancelled; a sent one cannot.
 */
const POST_DELAY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const SESSION_WORD: Record<SessionType, string> = {
  quali: 'qualifying',
  sprint_quali: 'sprint qualifying',
  sprint: 'sprint',
  race: 'race',
};

export type ResultEntry = {
  position: number;
  code: string;
  name: string;
  status: string | null;
};

function surname(name: string): string {
  return name.trim().split(/\s+/).pop() ?? name;
}

/** The podium in plain words. Throws when fewer than three drivers classified. */
export function resultsPostText(
  raceName: string,
  session: SessionType,
  entries: ResultEntry[],
): string {
  const top = entries.filter((entry) => !entry.status).slice(0, 3);
  if (top.length < 3) {
    throw new Error('A results post needs three classified finishers.');
  }
  const [first, second, third] = top.map((entry) => surname(entry.name));
  const name = raceName.replace(/ Grand Prix$/, ' GP');
  if (session === 'quali' || session === 'sprint_quali') {
    return `${name} ${SESSION_WORD[session]}: ${first} on pole, ${second} second, ${third} third.`;
  }
  return `${name} ${SESSION_WORD[session]}: ${first} wins from ${second} and ${third}.`;
}

/** A short stable fingerprint of a classification (djb2, hex). */
export function classificationRevision(entries: ResultEntry[]): string {
  const text = entries
    .map((entry) => `${entry.position}:${entry.code}:${entry.status ?? ''}`)
    .join('|');
  let hash = 5381;
  for (let index = 0; index < text.length; index++) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function resultsCardUrl(
  raceSlug: string,
  session: SessionType,
  revision: string,
): string {
  return `${SITE}/og/results?race=${encodeURIComponent(raceSlug)}&session=${session}&v=${revision}`;
}

/** Results published recently, each with its post row if there is one. */
export const recentResults = internalQuery({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    const out = [];
    for await (const result of ctx.db
      .query('results')
      .withIndex('by_publishedAt', (q) => q.gte('publishedAt', args.since))) {
      const race = await ctx.db.get(result.raceId);
      if (!race) {
        continue;
      }
      const statusByDriver = new Map(
        (result.driverStatuses ?? []).map((entry) => [
          entry.driverId,
          entry.status,
        ]),
      );
      const entries: ResultEntry[] = [];
      for (const [index, driverId] of result.classification.entries()) {
        const driver = await ctx.db.get(driverId);
        entries.push({
          position: index + 1,
          code: driver?.code ?? '???',
          name: driver?.displayName ?? 'Unknown',
          status: statusByDriver.get(driverId) ?? null,
        });
      }
      const post = await ctx.db
        .query('socialPosts')
        .withIndex('by_race_session_kind', (q) =>
          q
            .eq('raceId', result.raceId)
            .eq('sessionType', result.sessionType)
            .eq('kind', 'results'),
        )
        .unique();
      out.push({
        raceId: result.raceId,
        raceSlug: race.slug,
        raceName: race.name,
        sessionType: result.sessionType,
        publishedAt: result.publishedAt,
        entries,
        post: post
          ? {
              _id: post._id,
              status: post.status,
              revision: post.revision,
              bufferPostId: post.bufferPostId ?? null,
              dueAt: post.dueAt,
              attempts: post.attempts,
            }
          : null,
      });
    }
    return out;
  },
});

/** Journal the intent before the Buffer call, so a crash cannot double-post. */
export const begin = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: v.union(
      v.literal('quali'),
      v.literal('sprint_quali'),
      v.literal('sprint'),
      v.literal('race'),
    ),
    revision: v.string(),
    text: v.string(),
    dueAt: v.number(),
    existingId: v.optional(v.id('socialPosts')),
  },
  returns: v.id('socialPosts'),
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.existingId) {
      const existing = await ctx.db.get(args.existingId);
      if (!existing || !['failed', 'cancelled'].includes(existing.status)) {
        throw new Error('Only a failed or cancelled post can be retried.');
      }
      await ctx.db.patch(args.existingId, {
        revision: args.revision,
        text: args.text,
        dueAt: args.dueAt,
        status: 'creating',
        bufferPostId: undefined,
        error: undefined,
        attempts: existing.attempts + 1,
        updatedAt: now,
      });
      return args.existingId;
    }
    return await ctx.db.insert('socialPosts', {
      raceId: args.raceId,
      sessionType: args.sessionType,
      kind: 'results',
      revision: args.revision,
      status: 'creating',
      text: args.text,
      dueAt: args.dueAt,
      attempts: 1,
      updatedAt: now,
    });
  },
});

export const setStatus = internalMutation({
  args: {
    id: v.id('socialPosts'),
    status: v.union(
      v.literal('scheduled'),
      v.literal('sent'),
      v.literal('cancelled'),
      v.literal('failed'),
    ),
    bufferPostId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.bufferPostId ? { bufferPostId: args.bufferPostId } : {}),
      ...(args.error ? { error: args.error } : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

type BufferResult = { data?: Record<string, unknown>; errors?: unknown };

async function buffer(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(BUFFER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`Buffer ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as BufferResult;
  if (body.errors || !body.data) {
    throw new Error(`Buffer error: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data;
}

async function createBufferPost(
  apiKey: string,
  channelId: string,
  post: {
    text: string;
    dueAt: number;
    imageUrl: string;
    imageAlt: string;
    link: string;
  },
): Promise<string> {
  const assets = [
    { image: { url: post.imageUrl, metadata: { altText: post.imageAlt } } },
  ];
  const data = await buffer(
    apiKey,
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess { post { id status } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        channelId,
        mode: 'customScheduled',
        schedulingType: 'automatic',
        dueAt: new Date(post.dueAt).toISOString(),
        text: post.text,
        aiAssisted: false,
        source: 'grandprixpicks-results',
        assets,
        // The race page rides in a reply, where a link costs no reach.
        metadata: {
          twitter: {
            thread: [{ text: post.text, assets }, { text: post.link }],
          },
        },
      },
    },
  );
  const payload = data.createPost as
    | { __typename: 'PostActionSuccess'; post: { id: string; status: string } }
    | { __typename: string; message?: string };
  if (payload.__typename !== 'PostActionSuccess' || !('post' in payload)) {
    throw new Error(
      `Buffer refused the post: ${'message' in payload ? payload.message : payload.__typename}`,
    );
  }
  return payload.post.id;
}

async function deleteBufferPost(apiKey: string, id: string): Promise<void> {
  const data = await buffer(
    apiKey,
    `mutation DeletePost($input: DeletePostInput!) {
      deletePost(input: $input) {
        __typename
        ... on DeletePostSuccess { id }
        ... on MutationError { message }
      }
    }`,
    { input: { id } },
  );
  const payload = data.deletePost as { __typename: string; message?: string };
  if (payload.__typename !== 'DeletePostSuccess') {
    throw new Error(`Buffer did not delete ${id}: ${payload.message ?? ''}`);
  }
}

/** Cron entry: post every recently published classification once. */
export const postPublishedResults = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const apiKey = process.env.BUFFER_API_KEY;
    const channelId = process.env.BUFFER_X_CHANNEL_ID;
    if (!apiKey || !channelId) {
      return null;
    }
    const now = Date.now();
    const candidates = await ctx.runQuery(internal.socialPosts.recentResults, {
      since: now - LOOKBACK_MS,
    });
    for (const candidate of candidates) {
      const revision = classificationRevision(candidate.entries);
      const post = candidate.post;
      let retryOf: Id<'socialPosts'> | undefined;
      if (post) {
        if (post.status === 'creating') {
          console.error(
            `[socialPosts] ${candidate.raceSlug} ${candidate.sessionType}: a create was interrupted; inspect Buffer and the row before clearing it`,
          );
          continue;
        }
        if (post.status === 'scheduled' && post.dueAt <= now) {
          await ctx.runMutation(internal.socialPosts.setStatus, {
            id: post._id,
            status: 'sent',
          });
          continue;
        }
        if (post.status === 'scheduled' && post.revision !== revision) {
          // Amended while queued: the card it carries is stale.
          try {
            if (post.bufferPostId) {
              await deleteBufferPost(apiKey, post.bufferPostId);
            }
          } catch (error) {
            console.error('[socialPosts] cancel failed', error);
            continue;
          }
          await ctx.runMutation(internal.socialPosts.setStatus, {
            id: post._id,
            status: 'cancelled',
          });
          retryOf = post._id;
        } else if (post.status === 'scheduled' || post.status === 'sent') {
          continue;
        } else if (post.status === 'cancelled' && post.revision === revision) {
          continue;
        } else if (post.status === 'failed' && post.attempts >= MAX_ATTEMPTS) {
          continue;
        } else {
          retryOf = post._id;
        }
      }
      let text: string;
      try {
        text = resultsPostText(
          candidate.raceName,
          candidate.sessionType,
          candidate.entries,
        );
      } catch {
        continue;
      }
      const dueAt = now + POST_DELAY_MS;
      const rowId = await ctx.runMutation(internal.socialPosts.begin, {
        raceId: candidate.raceId,
        sessionType: candidate.sessionType,
        revision,
        text,
        dueAt,
        existingId: retryOf,
      });
      try {
        const bufferPostId = await createBufferPost(apiKey, channelId, {
          text,
          dueAt,
          imageUrl: resultsCardUrl(
            candidate.raceSlug,
            candidate.sessionType,
            revision,
          ),
          imageAlt: `${candidate.raceName} ${SESSION_WORD[candidate.sessionType]} classification`,
          link: `${SITE}/races/${encodeURIComponent(candidate.raceSlug)}`,
        });
        await ctx.runMutation(internal.socialPosts.setStatus, {
          id: rowId,
          status: 'scheduled',
          bufferPostId,
        });
      } catch (error) {
        console.error('[socialPosts] create failed', error);
        await ctx.runMutation(internal.socialPosts.setStatus, {
          id: rowId,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return null;
  },
});

/** For tests and operators: the rows for one race. */
export const listForRace = internalQuery({
  args: { raceId: v.id('races') },
  handler: async (ctx, args): Promise<Doc<'socialPosts'>[]> => {
    const rows = [];
    for await (const row of ctx.db
      .query('socialPosts')
      .withIndex('by_race_session_kind', (q) => q.eq('raceId', args.raceId))) {
      rows.push(row);
    }
    return rows;
  },
});
