import type { SessionType } from '@grandprixpicks/shared/sessions';
import { getSessionsForWeekend } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { ActionCtx, QueryCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { sessionConsensus } from './consensus';
import { loadChampionship } from './f1Standings';
import { getSessionLockAt } from './feed';

/**
 * Posts the app makes as @GrandPrixPicks on X with no human in the loop.
 *
 * Three kinds, all deterministic, so they run here on a cron rather than in a
 * cloud agent session (Barry, 2026-10-23). The news posts stay editorial and
 * go through the operator CLI.
 *
 * - `results`: a session's classification, minutes after it is published.
 * - `standings`: the drivers' championship after a race result.
 * - `consensus`: what players picked, once a session has locked and enough
 *   of them entered for the crowd to mean something.
 *
 * One post per race, session and kind, ever. The `socialPosts` row is the
 * guard: it is written before the Buffer call, so an action that dies
 * mid-way leaves a `creating` row that is reported and never retried blind.
 * Content that changes while its post is still queued (an amended result)
 * cancels the queued post and posts the corrected one; once sent it is left
 * alone, the way a sent news post is.
 *
 * Env-gated like Discord: without `BUFFER_API_KEY` and
 * `BUFFER_X_CHANNEL_ID` the scan is a no-op, which is what dev wants.
 */

const SITE = 'https://grandprixpicks.com';
const BUFFER_API = 'https://api.buffer.com';
/** How far back a published result or a lock is still worth posting. */
const LOOKBACK_MS = 36 * 60 * 60 * 1000;
/**
 * Queue the post a little after detection rather than sharing now. The
 * recheck against the official classification lands in this window for the
 * common corrections, and a queued post can be cancelled; a sent one cannot.
 */
const POST_DELAY_MS = 10 * 60 * 1000;
/** The standings post follows the race post, not competes with it. */
const STANDINGS_DELAY_MS = 25 * 60 * 1000;
const MAX_ATTEMPTS = 3;
/**
 * Below this many entrants a consensus post is a handful of people, not a
 * crowd, and reads as such. The poster stays silent until the number is
 * honest and starts by itself when it is (10-14 pickers a session in
 * October 2026).
 */
export const CONSENSUS_MIN_ENTRANTS = 25;

const SESSION_WORD: Record<SessionType, string> = {
  quali: 'qualifying',
  sprint_quali: 'sprint qualifying',
  sprint: 'sprint',
  race: 'race',
};

type Kind = Doc<'socialPosts'>['kind'];

export type ResultEntry = {
  position: number;
  code: string;
  name: string;
  status: string | null;
};

function surname(name: string): string {
  return name.trim().split(/\s+/).pop() ?? name;
}

function shortRace(raceName: string): string {
  return raceName.replace(/ Grand Prix$/, ' GP');
}

/** A short stable fingerprint of a post's content (djb2, hex). */
export function revisionOf(parts: readonly (string | number | null)[]): string {
  const text = parts.join('|');
  let hash = 5381;
  for (let index = 0; index < text.length; index++) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
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
  const name = shortRace(raceName);
  if (session === 'quali' || session === 'sprint_quali') {
    return `${name} ${SESSION_WORD[session]}: ${first} on pole, ${second} second, ${third} third.`;
  }
  return `${name} ${SESSION_WORD[session]}: ${first} wins from ${second} and ${third}.`;
}

export function classificationRevision(entries: ResultEntry[]): string {
  return revisionOf(
    entries.map(
      (entry) => `${entry.position}:${entry.code}:${entry.status ?? ''}`,
    ),
  );
}

export type StandingsEntry = {
  position: number;
  code: string;
  name: string;
  points: number;
};

/** "Antonelli leads Russell by 102 with five rounds left." */
export function standingsPostText(
  raceName: string,
  entries: StandingsEntry[],
  roundsLeft: number,
): string {
  const [leader, second] = entries;
  if (!leader || !second) {
    throw new Error('A standings post needs two drivers.');
  }
  const gap = leader.points - second.points;
  const lead =
    gap === 0
      ? `${surname(leader.name)} and ${surname(second.name)} are level on ${leader.points}`
      : `${surname(leader.name)} leads ${surname(second.name)} by ${gap}`;
  const left =
    roundsLeft === 0
      ? 'That is the season.'
      : `${roundsLeft} ${roundsLeft === 1 ? 'round' : 'rounds'} left.`;
  return `Drivers' championship after the ${shortRace(raceName)}: ${lead}. ${left}`;
}

export type ConsensusEntry = { code: string; name: string; pickRate: number };

/** "Austin qualifying: 41 players locked in. Verstappen is the pick for pole (62%), then Leclerc and Norris." */
export function consensusPostText(
  raceName: string,
  session: SessionType,
  entrants: number,
  entries: ConsensusEntry[],
): string {
  const [first, second, third] = entries;
  if (!first || !second || !third) {
    throw new Error('A consensus post needs three drivers.');
  }
  const slot =
    session === 'quali' || session === 'sprint_quali' ? 'pole' : 'the win';
  return `${shortRace(raceName)} ${SESSION_WORD[session]}: ${entrants} players locked in. ${surname(first.name)} is the pick for ${slot} (${Math.round(first.pickRate)}%), then ${surname(second.name)} and ${surname(third.name)}.`;
}

export function resultsCardUrl(
  raceSlug: string,
  session: SessionType,
  revision: string,
): string {
  return `${SITE}/og/results?race=${encodeURIComponent(raceSlug)}&session=${session}&v=${revision}`;
}

async function postRow(
  ctx: QueryCtx,
  raceId: Id<'races'>,
  sessionType: SessionType,
  kind: Kind,
) {
  const post = await ctx.db
    .query('socialPosts')
    .withIndex('by_race_session_kind', (q) =>
      q.eq('raceId', raceId).eq('sessionType', sessionType).eq('kind', kind),
    )
    .unique();
  return post
    ? {
        _id: post._id,
        status: post.status,
        revision: post.revision,
        bufferPostId: post.bufferPostId ?? null,
        dueAt: post.dueAt,
        attempts: post.attempts,
      }
    : null;
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
      out.push({
        raceId: result.raceId,
        raceSlug: race.slug,
        raceName: race.name,
        sessionType: result.sessionType,
        publishedAt: result.publishedAt,
        entries,
        post: await postRow(ctx, result.raceId, result.sessionType, 'results'),
      });
    }
    return out;
  },
});

/**
 * The drivers' championship after the most recent race result in the
 * window, with how many rounds the season has left after it.
 */
export const standingsCandidate = internalQuery({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    let latest: Doc<'results'> | null = null;
    for await (const result of ctx.db
      .query('results')
      .withIndex('by_publishedAt', (q) => q.gte('publishedAt', args.since))) {
      if (
        result.sessionType === 'race' &&
        (!latest || result.publishedAt > latest.publishedAt)
      ) {
        latest = result;
      }
    }
    if (!latest) {
      return null;
    }
    const race = await ctx.db.get(latest.raceId);
    if (!race) {
      return null;
    }
    const championship = await loadChampionship(ctx, race.season);
    const entries: StandingsEntry[] = championship.drivers
      .slice(0, 10)
      .map((driver) => ({
        position: driver.position,
        code: driver.code,
        name: driver.displayName,
        points: driver.points,
      }));
    let roundsLeft = 0;
    for await (const other of ctx.db.query('races')) {
      if (other.season === race.season && other.round > race.round) {
        roundsLeft += 1;
      }
    }
    return {
      raceId: race._id,
      raceSlug: race.slug,
      raceName: race.name,
      season: race.season,
      roundsLeft,
      entries,
      post: await postRow(ctx, race._id, 'race', 'standings'),
    };
  },
});

/** Sessions that locked in the window, with what players picked. */
export const consensusCandidates = internalQuery({
  args: { since: v.number(), now: v.number() },
  handler: async (ctx, args) => {
    const out = [];
    for await (const race of ctx.db.query('races')) {
      for (const sessionType of getSessionsForWeekend(
        Boolean(race.hasSprint),
      )) {
        const lockAt = getSessionLockAt(race, sessionType);
        if (lockAt == null || lockAt < args.since || lockAt > args.now) {
          continue;
        }
        const consensus = await sessionConsensus(ctx, race, sessionType);
        out.push({
          raceId: race._id,
          raceSlug: race.slug,
          raceName: race.name,
          sessionType,
          lockAt,
          entrants: consensus?.entrants ?? 0,
          entries: (consensus?.drivers ?? []).slice(0, 5).map((driver) => ({
            code: driver.code,
            name: driver.displayName,
            pickRate: driver.pickRate,
          })),
          post: await postRow(ctx, race._id, sessionType, 'consensus'),
        });
      }
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
    kind: v.union(
      v.literal('results'),
      v.literal('standings'),
      v.literal('consensus'),
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
      kind: args.kind,
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
    kind: Kind;
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
        source: `grandprixpicks-${post.kind}`,
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

type PostRow = {
  _id: Id<'socialPosts'>;
  status: Doc<'socialPosts'>['status'];
  revision: string;
  bufferPostId: string | null;
  dueAt: number;
  attempts: number;
} | null;

/**
 * The one journal-and-post routine behind all three kinds. Returns without
 * posting when the row says the post exists, is in flight, or gave up.
 */
async function schedule(
  ctx: ActionCtx,
  auth: { apiKey: string; channelId: string },
  now: number,
  candidate: {
    raceId: Id<'races'>;
    raceSlug: string;
    sessionType: SessionType;
    kind: Kind;
    revision: string;
    text: string;
    imageUrl: string;
    imageAlt: string;
    delayMs: number;
    post: PostRow;
  },
) {
  const label = `${candidate.raceSlug} ${candidate.sessionType} ${candidate.kind}`;
  const post = candidate.post;
  let retryOf: Id<'socialPosts'> | undefined;
  if (post) {
    if (post.status === 'creating') {
      console.error(
        `[socialPosts] ${label}: a create was interrupted; inspect Buffer and the row before clearing it`,
      );
      return;
    }
    if (post.status === 'scheduled' && post.dueAt <= now) {
      await ctx.runMutation(internal.socialPosts.setStatus, {
        id: post._id,
        status: 'sent',
      });
      return;
    }
    if (post.status === 'scheduled' && post.revision !== candidate.revision) {
      // Changed while queued: the card it carries is stale.
      try {
        if (post.bufferPostId) {
          await deleteBufferPost(auth.apiKey, post.bufferPostId);
        }
      } catch (error) {
        console.error(`[socialPosts] ${label}: cancel failed`, error);
        return;
      }
      await ctx.runMutation(internal.socialPosts.setStatus, {
        id: post._id,
        status: 'cancelled',
      });
      retryOf = post._id;
    } else if (post.status === 'scheduled' || post.status === 'sent') {
      return;
    } else if (
      post.status === 'cancelled' &&
      post.revision === candidate.revision
    ) {
      return;
    } else if (post.status === 'failed' && post.attempts >= MAX_ATTEMPTS) {
      return;
    } else {
      retryOf = post._id;
    }
  }
  const dueAt = now + candidate.delayMs;
  const rowId = await ctx.runMutation(internal.socialPosts.begin, {
    raceId: candidate.raceId,
    sessionType: candidate.sessionType,
    kind: candidate.kind,
    revision: candidate.revision,
    text: candidate.text,
    dueAt,
    existingId: retryOf,
  });
  try {
    const bufferPostId = await createBufferPost(auth.apiKey, auth.channelId, {
      text: candidate.text,
      dueAt,
      imageUrl: candidate.imageUrl,
      imageAlt: candidate.imageAlt,
      link: `${SITE}/races/${encodeURIComponent(candidate.raceSlug)}`,
      kind: candidate.kind,
    });
    await ctx.runMutation(internal.socialPosts.setStatus, {
      id: rowId,
      status: 'scheduled',
      bufferPostId,
    });
  } catch (error) {
    console.error(`[socialPosts] ${label}: create failed`, error);
    await ctx.runMutation(internal.socialPosts.setStatus, {
      id: rowId,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Cron entry: results, standings and consensus, each posted once. */
export const postPublishedResults = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const apiKey = process.env.BUFFER_API_KEY;
    const channelId = process.env.BUFFER_X_CHANNEL_ID;
    if (!apiKey || !channelId) {
      return null;
    }
    const auth = { apiKey, channelId };
    const now = Date.now();
    const since = now - LOOKBACK_MS;

    const results = await ctx.runQuery(internal.socialPosts.recentResults, {
      since,
    });
    for (const candidate of results) {
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
      const revision = classificationRevision(candidate.entries);
      await schedule(ctx, auth, now, {
        raceId: candidate.raceId,
        raceSlug: candidate.raceSlug,
        sessionType: candidate.sessionType,
        kind: 'results',
        revision,
        text,
        imageUrl: resultsCardUrl(
          candidate.raceSlug,
          candidate.sessionType,
          revision,
        ),
        imageAlt: `${candidate.raceName} ${SESSION_WORD[candidate.sessionType]} classification`,
        delayMs: POST_DELAY_MS,
        post: candidate.post,
      });
    }

    const standings = await ctx.runQuery(
      internal.socialPosts.standingsCandidate,
      { since },
    );
    if (standings) {
      try {
        const text = standingsPostText(
          standings.raceName,
          standings.entries,
          standings.roundsLeft,
        );
        const revision = revisionOf(
          standings.entries.map((entry) => `${entry.code}:${entry.points}`),
        );
        await schedule(ctx, auth, now, {
          raceId: standings.raceId,
          raceSlug: standings.raceSlug,
          sessionType: 'race',
          kind: 'standings',
          revision,
          text,
          imageUrl: `${SITE}/og/standings?after=${encodeURIComponent(standings.raceSlug)}&v=${revision}`,
          imageAlt: `Drivers' championship after the ${standings.raceName}`,
          delayMs: STANDINGS_DELAY_MS,
          post: standings.post,
        });
      } catch (error) {
        console.error('[socialPosts] standings skipped', error);
      }
    }

    const consensus = await ctx.runQuery(
      internal.socialPosts.consensusCandidates,
      { since, now },
    );
    for (const candidate of consensus) {
      if (candidate.entrants < CONSENSUS_MIN_ENTRANTS) {
        continue;
      }
      let text: string;
      try {
        text = consensusPostText(
          candidate.raceName,
          candidate.sessionType,
          candidate.entrants,
          candidate.entries,
        );
      } catch {
        continue;
      }
      // Picks are locked, so the content cannot change: one revision ever.
      const revision = revisionOf([candidate.lockAt]);
      await schedule(ctx, auth, now, {
        raceId: candidate.raceId,
        raceSlug: candidate.raceSlug,
        sessionType: candidate.sessionType,
        kind: 'consensus',
        revision,
        text,
        imageUrl: `${SITE}/og/consensus?race=${encodeURIComponent(candidate.raceSlug)}&session=${candidate.sessionType}&v=${revision}`,
        imageAlt: `What players picked for ${candidate.raceName} ${SESSION_WORD[candidate.sessionType]}`,
        delayMs: POST_DELAY_MS,
        post: candidate.post,
      });
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
