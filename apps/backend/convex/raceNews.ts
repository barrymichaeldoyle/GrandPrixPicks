import { v } from 'convex/values';

import { internal } from './_generated/api';
import { raceNewsWriteUpImageValidator } from './lib/raceNewsWriteUpImage';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, query } from './_generated/server';

/**
 * Pick-relevant news for a race weekend. See `docs/race-news.md`.
 *
 * The authoring surface is `npx convex run`, not a form: the workflow is to
 * prompt an agent to research the weekend and publish what changes a pick, so
 * these signatures and their return values are the interface a person actually
 * touches. They are written to be re-run — every one is idempotent, and
 * `publish` reports whether it created or updated so the caller can say what
 * happened without checking.
 */

// Declared here rather than imported: `schema.ts` keeps its own copy private,
// and every module that needs one defines it locally (see `predictions.ts`,
// `push.ts`).
const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);
const sessionTypesValidator = v.array(sessionTypeValidator);

/**
 * A read bound rather than an editorial one. There is no cap on how much news a
 * weekend may carry — a busy weekend with several real items is a better feed
 * than a quiet one — but a read still has to be bounded, and fifty is far above
 * any weekend that has ever happened.
 */
const MAX_NEWS_PER_RACE = 50;

const raceNewsListResultValidator = v.object({
  race: v.union(
    v.null(),
    v.object({ slug: v.string(), name: v.string(), round: v.number() }),
  ),
  items: v.array(
    v.object({
      key: v.string(),
      headline: v.string(),
      body: v.string(),
      affectsSessions: sessionTypesValidator,
      sourceName: v.string(),
      sourceUrl: v.string(),
      active: v.boolean(),
      publishedAt: v.number(),
      drivers: v.array(
        v.object({
          code: v.string(),
          displayName: v.string(),
          team: v.union(v.string(), v.null()),
          number: v.union(v.number(), v.null()),
          nationality: v.union(v.string(), v.null()),
        }),
      ),
      writeUpImage: v.optional(raceNewsWriteUpImageValidator),
    }),
  ),
});

/** The sessions a weekend actually runs. */
export function sessionsForWeekend(hasSprint: boolean): string[] {
  return hasSprint
    ? ['sprint_quali', 'sprint', 'quali', 'race']
    : ['quali', 'race'];
}

/**
 * Everything `publish` refuses, as one pure function so the rules can be tested
 * without a database.
 *
 * Returns the message to throw, or null when the input is publishable. The
 * messages are written for whoever ran the command: an agent that gets one back
 * should be able to fix the call without reading this file.
 */
export function validatePublishInput(input: {
  raceName: string;
  hasSprint: boolean;
  affectsSessions: string[];
  sourceUrl: string;
}): string | null {
  if (input.affectsSessions.length === 0) {
    return (
      'affectsSessions must name at least one session. If this news changes ' +
      'no pick, it belongs on a write-up page rather than in the feed.'
    );
  }

  // A weekend only runs the sessions it has, so `["sprint"]` on a conventional
  // weekend is a mistake worth catching before it reaches the feed and flags a
  // tab that is not there.
  const weekend = sessionsForWeekend(input.hasSprint);
  const impossible = input.affectsSessions.filter((s) => !weekend.includes(s));
  if (impossible.length > 0) {
    return (
      `${input.raceName} has no ${impossible.join(', ')} session. ` +
      `This weekend runs: ${weekend.join(', ')}.`
    );
  }

  if (!/^https?:\/\//.test(input.sourceUrl)) {
    return 'sourceUrl must be a full http(s) URL.';
  }

  return null;
}

async function raceBySlug(ctx: QueryCtx | MutationCtx, slug: string) {
  return await ctx.db
    .query('races')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();
}

/**
 * The race an operator named, by slug or by id.
 *
 * The audit trail gets read from wherever the operator already is, and that is
 * often not a slug: a feed event, a `races` row and the admin surfaces all hand
 * back an id. Refusing one of the two identifiers the caller is holding buys
 * nothing, so this takes either and says so when it gets neither.
 */
async function raceByRef(
  ctx: QueryCtx,
  ref: { raceSlug?: string; raceId?: Id<'races'> },
): Promise<Doc<'races'> | null> {
  if (ref.raceSlug !== undefined) {
    return await raceBySlug(ctx, ref.raceSlug);
  }
  if (ref.raceId !== undefined) {
    return await ctx.db.get(ref.raceId);
  }
  throw new Error(
    'Name the race: pass raceSlug (for example "italy-2026") or raceId.',
  );
}

async function newsByKey(
  ctx: QueryCtx | MutationCtx,
  raceId: Id<'races'>,
  key: string,
) {
  return await ctx.db
    .query('raceNews')
    .withIndex('by_race_key', (q) => q.eq('raceId', raceId).eq('key', key))
    .unique();
}

/** The feed event this item already wrote, if it has one. */
async function feedEventForNews(
  ctx: MutationCtx,
  raceId: Id<'races'>,
  key: string,
) {
  return await ctx.db
    .query('feedEvents')
    .withIndex('by_race_news_key', (q) =>
      q.eq('raceId', raceId).eq('newsKey', key),
    )
    .unique();
}

async function listRaceNews(
  ctx: QueryCtx,
  race: Doc<'races'> | null,
  includeRetracted: boolean,
) {
  if (!race) {
    return { race: null, items: [] };
  }

  const rows = await ctx.db
    .query('raceNews')
    .withIndex('by_race', (q) => q.eq('raceId', race._id))
    .take(MAX_NEWS_PER_RACE);

  const visible = (
    includeRetracted ? rows : rows.filter((row) => row.active)
  ).sort((a, b) => b.publishedAt - a.publishedAt);

  // Resolved here rather than by each caller. The record stores codes,
  // because who drives for whom is round-scoped and a stored team name would
  // be a second copy of a moving fact; the badge needs the roster to draw.
  // Doing it once means the write-up pages and the feed cannot disagree.
  const roster = await driversForCodes(
    ctx,
    visible.flatMap((row) => row.driverCodes ?? []),
  );

  const items = visible.map((row) => ({
    key: row.key,
    headline: row.headline,
    body: row.body,
    affectsSessions: row.affectsSessions,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    active: row.active,
    publishedAt: row.publishedAt,
    drivers: (row.driverCodes ?? []).flatMap((code) => {
      const driver = roster.get(code);
      return driver ? [driver] : [];
    }),
    writeUpImage: row.writeUpImage,
  }));

  return {
    race: { slug: race.slug, name: race.name, round: race.round },
    items,
  };
}

/** Active news for public feeds and write-up pages. */
export const list = query({
  args: { raceSlug: v.string() },
  returns: raceNewsListResultValidator,
  handler: async (ctx, args) => {
    return await listRaceNews(ctx, await raceBySlug(ctx, args.raceSlug), false);
  },
});

/**
 * Active and retracted news for the operator audit trail.
 *
 * Takes either identifier, because an operator arriving from a feed event or a
 * `races` row is holding an id rather than a slug.
 *
 * Run via:
 *   npx convex run --prod raceNews:listForOperators '{"raceSlug":"italy-2026"}'
 *   npx convex run --prod raceNews:listForOperators '{"raceId":"jd7..."}'
 */
export const listForOperators = internalQuery({
  args: {
    raceSlug: v.optional(v.string()),
    raceId: v.optional(v.id('races')),
  },
  returns: raceNewsListResultValidator,
  handler: async (ctx, args) => {
    return await listRaceNews(ctx, await raceByRef(ctx, args), true);
  },
});

/** Active news for a race, for the feed and the write-up pages. */
export async function loadActiveRaceNews(
  ctx: QueryCtx,
  raceId: Id<'races'>,
): Promise<Doc<'raceNews'>[]> {
  const rows = await ctx.db
    .query('raceNews')
    .withIndex('by_race', (q) => q.eq('raceId', raceId))
    .take(MAX_NEWS_PER_RACE);
  return rows
    .filter((row) => row.active)
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

/**
 * Publish or correct one news item.
 *
 * Upsert, not insert, keyed on `(raceSlug, key)`. Agents retry and the same
 * weekend gets prompted about more than once; without that, three runs put
 * three copies of the same story in the feed.
 *
 * A correction edits the existing feed event in place rather than posting a
 * second one, the same way `results_amended` converts a `score_published` when
 * a stewards' decision moves the classification. "Ten places minimum" becoming
 * "confirmed back of grid" is an edit, not news.
 *
 * `affectsSessions` is required and must be non-empty. Naming the sessions an
 * item changes *is* the test for whether it belongs in the feed, and a
 * validator applies that test where a comment in a doc gets skimmed. If the
 * honest answer is "none", this is a story for a write-up page and not for
 * somebody's feed.
 *
 * Run with `dryRun: true` first. It reports exactly what a real run would do
 * and writes nothing.
 *
 * Run via:
 *   npx convex run --prod raceNews:publish '{
 *     "raceSlug": "italy-2026",
 *     "key": "antonelli-grid-penalty",
 *     "headline": "Antonelli takes a grid penalty at Monza",
 *     "body": "Mercedes has confirmed a full power unit change. Ten places minimum.",
 *     "affectsSessions": ["race"],
 *     "sourceName": "Formula 1",
 *     "sourceUrl": "https://www.formula1.com/en/latest/article/...",
 *     "dryRun": true
 *   }'
 */
/**
 * The roster rows a set of codes needs, as a map, in one pass.
 *
 * A driver dropped from the roster resolves to nothing rather than throwing:
 * publishing validates the codes, so by the time a page reads them the only
 * way to miss is a roster edit afterwards, and a card short one badge beats a
 * page that will not render.
 */
async function driversForCodes(
  ctx: QueryCtx,
  codes: string[],
): Promise<
  Map<
    string,
    {
      code: string;
      displayName: string;
      team: string | null;
      number: number | null;
      nationality: string | null;
    }
  >
> {
  const resolved = new Map<
    string,
    {
      code: string;
      displayName: string;
      team: string | null;
      number: number | null;
      nationality: string | null;
    }
  >();
  for (const code of new Set(codes)) {
    const driver = await ctx.db
      .query('drivers')
      .withIndex('by_code', (q) => q.eq('code', code))
      .first();
    if (driver) {
      resolved.set(code, {
        code: driver.code,
        displayName: driver.displayName,
        team: driver.team ?? null,
        number: driver.number ?? null,
        nationality: driver.nationality ?? null,
      });
    }
  }
  return resolved;
}

export const publish = internalMutation({
  args: {
    raceSlug: v.string(),
    key: v.string(),
    headline: v.string(),
    body: v.string(),
    affectsSessions: sessionTypesValidator,
    sourceName: v.string(),
    sourceUrl: v.string(),
    /**
     * Driver codes the item is about, e.g. `["ANT"]`. Optional: news about a
     * team, a circuit or the weather belongs to no driver.
     */
    driverCodes: v.optional(v.array(v.string())),
    writeUpImage: v.optional(raceNewsWriteUpImageValidator),
    /**
     * Hold the feed card until this moment (ms epoch). The write-up page shows
     * the item immediately either way, which is the point: news for a later
     * round earns its SEO the day it breaks, while the feed stays about the
     * weekend the reader is picking. Omit for news about the current weekend.
     */
    feedVisibleAt: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    const race = await raceBySlug(ctx, args.raceSlug);
    if (!race) {
      throw new Error(
        `No race with slug "${args.raceSlug}". Check the slug against the calendar.`,
      );
    }
    const problem = validatePublishInput({
      raceName: race.name,
      hasSprint: Boolean(race.hasSprint),
      affectsSessions: args.affectsSessions,
      sourceUrl: args.sourceUrl,
    });
    if (problem) {
      throw new Error(problem);
    }

    // Resolved before the write so a typo fails at publish with a message
    // naming the bad code, rather than publishing an item whose badge silently
    // never renders. An agent re-running this needs the failure to be loud.
    const resolved = await resolveDriverCodes(ctx, args.driverCodes);
    const driverCodes = resolved?.codes;

    const existing = await newsByKey(ctx, race._id, args.key);
    const now = Date.now();
    const action = existing
      ? existing.active
        ? ('updated' as const)
        : ('republished' as const)
      : ('created' as const);

    const feedVisibleAt = args.feedVisibleAt ?? existing?.feedVisibleAt;
    const alreadyInFeed =
      (await feedEventForNews(ctx, race._id, args.key)) !== null;
    // An item already in the feed cannot be un-published by an embargo: that is
    // what `retract` is for. So the hold only applies while the card has yet to
    // appear.
    const heldBack =
      !alreadyInFeed && feedVisibleAt !== undefined && feedVisibleAt > now;

    if (dryRun) {
      return {
        dryRun: true,
        action,
        feedVisibleAt: heldBack ? feedVisibleAt : undefined,
        race: { slug: race.slug, name: race.name, round: race.round },
        key: args.key,
        headline: args.headline,
        affectsSessions: args.affectsSessions,
        driverCodes,
      };
    }

    const fields = {
      raceId: race._id,
      key: args.key,
      headline: args.headline,
      body: args.body,
      affectsSessions: args.affectsSessions,
      sourceName: args.sourceName,
      sourceUrl: args.sourceUrl,
      driverCodes,
      // Spread rather than assigned, so republishing corrected copy for an item
      // that has a photo does not have to restate the photo to keep it. The
      // trade is that `publish` cannot clear one: `patch` leaves an omitted key
      // alone. A photo attached to the wrong item comes off with `retract` and
      // a republish, or a hand patch.
      ...(args.writeUpImage !== undefined
        ? { writeUpImage: args.writeUpImage }
        : {}),
      ...(args.feedVisibleAt !== undefined
        ? { feedVisibleAt: args.feedVisibleAt }
        : {}),
      active: true,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert('raceNews', { ...fields, publishedAt: now });
    }

    if (heldBack) {
      await scheduleFeedRelease(ctx, race._id, args.key, feedVisibleAt);
    } else {
      await syncFeedEvent(ctx, race, args, resolved?.drivers, now);
    }

    return {
      action,
      race: { slug: race.slug, name: race.name, round: race.round },
      key: args.key,
      headline: args.headline,
      affectsSessions: args.affectsSessions,
      driverCodes,
      feedVisibleAt: heldBack ? feedVisibleAt : undefined,
    };
  },
});

/**
 * Move the scheduled release, or set one.
 *
 * Cancel-then-schedule rather than schedule-once, because publishing is an
 * upsert an agent re-runs: without the cancel, correcting an embargoed item
 * three times leaves three jobs racing to write the same card. The release
 * itself is idempotent too, so a job that escapes the cancel is harmless.
 */
async function scheduleFeedRelease(
  ctx: MutationCtx,
  raceId: Id<'races'>,
  key: string,
  at: number,
) {
  const row = await newsByKey(ctx, raceId, key);
  if (!row) {
    return;
  }
  if (row.feedReleaseScheduledId) {
    try {
      await ctx.scheduler.cancel(
        row.feedReleaseScheduledId as Id<'_scheduled_functions'>,
      );
    } catch {
      // Already ran or was cancelled: the release is idempotent, so nothing to do.
    }
  }
  const scheduledId = await ctx.scheduler.runAt(
    at,
    internal.raceNews.releaseToFeed,
    { raceId, key },
  );
  await ctx.db.patch(row._id, {
    feedReleaseScheduledId: scheduledId as unknown as string,
  });
}

/**
 * Put an embargoed item into the feed.
 *
 * Scheduled by `publish`, and safe to run by hand if a release is ever missed:
 * it re-reads the item, so it publishes what the item says *now* rather than
 * what it said when the job was booked, and it does nothing at all for an item
 * that has been retracted or has already appeared.
 *
 * Run via:
 *   npx convex run --prod raceNews:releaseToFeed '{"raceId":"jd7...","key":"..."}'
 */
export const releaseToFeed = internalMutation({
  args: { raceId: v.id('races'), key: v.string() },
  handler: async (ctx, args) => {
    const row = await newsByKey(ctx, args.raceId, args.key);
    if (!row) {
      return { action: 'not_found' as const, key: args.key };
    }
    await ctx.db.patch(row._id, { feedReleaseScheduledId: undefined });

    if (!row.active) {
      return { action: 'retracted' as const, key: args.key };
    }
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return { action: 'not_found' as const, key: args.key };
    }
    if (await feedEventForNews(ctx, args.raceId, args.key)) {
      return { action: 'already_in_feed' as const, key: args.key };
    }

    const roster = await driversForCodes(ctx, row.driverCodes ?? []);
    const drivers = (row.driverCodes ?? []).flatMap((code) => {
      const driver = roster.get(code);
      return driver ? [driver] : [];
    });

    await syncFeedEvent(ctx, race, row, drivers, Date.now());

    return {
      action: 'released' as const,
      race: { slug: race.slug, name: race.name },
      key: args.key,
      headline: row.headline,
    };
  },
});

/**
 * Check every code against the roster, and normalise case while we are here.
 *
 * Publishing is the last moment anyone is paying attention to this item, so it
 * is the right place to reject `ANTO` or `Ant0`. The alternative is a card that
 * renders with a missing badge weeks later, which nobody notices because the
 * page still looks fine.
 */
async function resolveDriverCodes(
  ctx: MutationCtx,
  codes: string[] | undefined,
): Promise<
  | {
      codes: string[];
      drivers: {
        code: string;
        displayName: string;
        team: string | null;
        number: number | null;
        nationality: string | null;
      }[];
    }
  | undefined
> {
  if (!codes || codes.length === 0) {
    return undefined;
  }
  const normalised = [...new Set(codes.map((code) => code.toUpperCase()))];
  const unknown: string[] = [];
  const drivers = [];
  for (const code of normalised) {
    const driver = await ctx.db
      .query('drivers')
      .withIndex('by_code', (q) => q.eq('code', code))
      .first();
    if (!driver) {
      unknown.push(code);
      continue;
    }
    drivers.push({
      code: driver.code,
      displayName: driver.displayName,
      team: driver.team ?? null,
      number: driver.number ?? null,
      nationality: driver.nationality ?? null,
    });
  }
  if (unknown.length > 0) {
    throw new Error(
      `Unknown driver ${unknown.length === 1 ? 'code' : 'codes'}: ${unknown.join(', ')}. Use the three-letter code from the roster, e.g. ANT.`,
    );
  }
  return { codes: normalised, drivers };
}

/**
 * Mirror the item into the feed.
 *
 * Authorless, like `lineup_change`: this is the site talking rather than a
 * player, and the feed's scoping already shows an event with no `userId` to
 * everyone. Fields are denormalised so rendering a page of feed does not cost a
 * second read per news event.
 *
 * `createdAt` is left alone on an edit. A correction should stay where the
 * original sat between the sessions either side of it, not jump to the top of
 * the feed as though it were new.
 */
async function syncFeedEvent(
  ctx: MutationCtx,
  race: Doc<'races'>,
  args: {
    key: string;
    headline: string;
    body: string;
    affectsSessions: string[];
    sourceName: string;
    sourceUrl: string;
  },
  drivers:
    | {
        code: string;
        displayName: string;
        team: string | null;
        number: number | null;
        nationality: string | null;
      }[]
    | undefined,
  now: number,
) {
  const shared = {
    newsHeadline: args.headline,
    newsBody: args.body,
    newsAffectsSessions:
      args.affectsSessions as Doc<'feedEvents'>['newsAffectsSessions'],
    newsSourceName: args.sourceName,
    newsSourceUrl: args.sourceUrl,
    newsDrivers: drivers,
    raceName: race.name,
    raceSlug: race.slug,
    season: race.season,
  };

  const existing = await feedEventForNews(ctx, race._id, args.key);
  if (existing) {
    await ctx.db.patch(existing._id, shared);
    return;
  }

  await ctx.db.insert('feedEvents', {
    type: 'race_news',
    raceId: race._id,
    newsKey: args.key,
    ...shared,
    revCount: 0,
    createdAt: now,
  });
}

/**
 * Pull an item from the feed.
 *
 * The realistic use is a phone: an agent published something wrong and it needs
 * to be gone before the session locks. Retraction rather than deletion, so a
 * mistake leaves a trail, and the feed event goes because a retracted item
 * should not be readable.
 *
 * Run via:
 *   npx convex run --prod raceNews:retract '{"raceSlug":"italy-2026","key":"antonelli-grid-penalty"}'
 */
export const retract = internalMutation({
  args: { raceSlug: v.string(), key: v.string() },
  handler: async (ctx, args) => {
    const race = await raceBySlug(ctx, args.raceSlug);
    if (!race) {
      throw new Error(`No race with slug "${args.raceSlug}".`);
    }
    const existing = await newsByKey(ctx, race._id, args.key);
    if (!existing) {
      return { action: 'not_found' as const, key: args.key };
    }

    if (existing.feedReleaseScheduledId) {
      try {
        await ctx.scheduler.cancel(
          existing.feedReleaseScheduledId as Id<'_scheduled_functions'>,
        );
      } catch {
        // Already ran or was cancelled. The release checks `active`, so an item
        // retracted before its embargo lifts stays out of the feed either way.
      }
    }
    await ctx.db.patch(existing._id, {
      active: false,
      feedReleaseScheduledId: undefined,
      updatedAt: Date.now(),
    });
    const event = await feedEventForNews(ctx, race._id, args.key);
    if (event) {
      await ctx.db.delete(event._id);
    }

    return {
      action: 'retracted' as const,
      race: { slug: race.slug, name: race.name },
      key: args.key,
      headline: existing.headline,
    };
  },
});
