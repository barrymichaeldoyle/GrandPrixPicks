import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import {
  raceNewsStartingGridValidator,
  resolvedStartingGridValidator,
  sortStartingGrid,
  validateStartingGrid,
  type ResolvedStartingGridEntry,
  type StartingGridEntry,
} from './lib/raceNewsStartingGrid';
import { feedSortFor, insertFeedEvent } from './lib/feedSort';
import { raceNewsWriteUpImageValidator } from './lib/raceNewsWriteUpImage';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, query } from './_generated/server';

/**
 * Reviewed news for a race weekend. See `docs/race-news.md`.
 *
 * The authoring surface is `npx convex run`, not a form: the workflow is to
 * prompt an agent to research the weekend and publish a sourced story, so
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Below this, a millisecond timestamp would be dated before 1973, so anything
 * under it is a seconds-epoch value that was not converted.
 */
const SECONDS_EPOCH_CEILING = 100_000_000_000;

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
      headlineUpdatedAt: v.optional(v.number()),
      sourcePublishedAt: v.optional(v.number()),
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
      startingGrid: v.optional(resolvedStartingGridValidator),
    }),
  ),
});

/**
 * Put names and teams on a stored grid, in starting order.
 *
 * A code the roster no longer knows keeps its row and shows the code, rather
 * than being dropped the way a missing news badge is. Publishing validates
 * every code, so the only way to get here is a roster edit afterwards, and a
 * grid silently one row short is the failure this whole feature has to avoid:
 * 21 rows of 22 looks completely fine and the missing one is somebody's pick.
 */
export function resolveStartingGrid(
  entries: StartingGridEntry[],
  lookup: (
    code: string,
  ) =>
    | { displayName: string; team: string | null; number?: number | null }
    | undefined,
): ResolvedStartingGridEntry[] {
  return sortStartingGrid(entries).map((entry) => {
    const driver = lookup(entry.code);
    return {
      position: entry.position,
      code: entry.code,
      displayName: driver?.displayName ?? entry.code,
      team: driver?.team ?? null,
      number: driver?.number ?? null,
      ...(entry.note !== undefined ? { note: entry.note } : {}),
      ...(entry.newsKey !== undefined ? { newsKey: entry.newsKey } : {}),
    };
  });
}

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
  category?: 'pick_related' | 'general';
  affectsSessions: string[];
  sourceUrl: string;
  sourcePublishedAt?: number;
  now: number;
}): string | null {
  if (
    (input.category ?? 'pick_related') === 'pick_related' &&
    input.affectsSessions.length === 0
  ) {
    return 'Pick-related news must name at least one session; general news may have none.';
  }
  if (input.category === 'general' && input.affectsSessions.length !== 0) {
    return 'General news cannot name affected sessions.';
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

  const sourcePublishedAt = input.sourcePublishedAt;
  if (sourcePublishedAt !== undefined) {
    // Seconds where milliseconds were meant is the mistake to expect: most
    // article metadata is in seconds, and the two are indistinguishable to a
    // validator that only checks the type. Left alone it dates a 2026 penalty
    // to 1970, which renders as a perfectly ordinary date on the card.
    if (sourcePublishedAt < SECONDS_EPOCH_CEILING) {
      return (
        'sourcePublishedAt looks like seconds, not milliseconds. ' +
        `Multiply by 1000: ${sourcePublishedAt * 1000}.`
      );
    }
    // A day of slack, because a source's timestamp is in its own timezone and
    // occasionally runs ahead of ours. Beyond that it is a typo, and a card
    // dated tomorrow undermines every date on the page.
    if (sourcePublishedAt > input.now + DAY_MS) {
      return 'sourcePublishedAt is in the future. Use when the source published the story.';
    }
  }

  return null;
}

/** `2026-09-05`, for reporting a stored timestamp back to whoever ran the command. */
function isoDay(at: number | undefined): string | undefined {
  return at === undefined ? undefined : new Date(at).toISOString().slice(0, 10);
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
  throw new ConvexError(
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
    includeRetracted
      ? rows
      : rows.filter((row) => row.active && row.writeUpSelected !== false)
  ).sort((a, b) => b.publishedAt - a.publishedAt);

  // Resolved here rather than by each caller. The record stores codes,
  // because who drives for whom is round-scoped and a stored team name would
  // be a second copy of a moving fact; the badge needs the roster to draw.
  // Doing it once means the write-up pages and the feed cannot disagree.
  const roster = await driversForCodes(
    ctx,
    visible.flatMap((row) => [
      ...(row.driverCodes ?? []),
      ...(row.startingGrid ?? []).map((entry) => entry.code),
    ]),
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
    headlineUpdatedAt: row.headlineUpdatedAt,
    sourcePublishedAt: row.sourcePublishedAt,
    drivers: (row.driverCodes ?? []).flatMap((code) => {
      const driver = roster.get(code);
      return driver ? [driver] : [];
    }),
    writeUpImage: row.writeUpImage,
    startingGrid: row.startingGrid
      ? resolveStartingGrid(row.startingGrid, (code) => roster.get(code))
      : undefined,
  }));

  return {
    race: { slug: race.slug, name: race.name, round: race.round },
    items,
  };
}

/** Active weekend news selected for write-up pages. Feed cards read `feedEvents`. */
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

/**
 * The landing page's headlines for the next race: what the write-up carries,
 * cut to a line each so the home page links into it instead of copying it.
 *
 * Stories that change a session lead, newest first within each group: a
 * visitor reading these sits next to the picker, and a grid penalty is the
 * one thing that changes the pick they are about to make.
 */
export async function loadNewsHeadlines(
  ctx: QueryCtx,
  race: Doc<'races'>,
  limit: number,
) {
  const { items } = await listRaceNews(ctx, race, false);
  const picksFirst = [
    ...items.filter((item) => item.affectsSessions.length > 0),
    ...items.filter((item) => item.affectsSessions.length === 0),
  ];
  return {
    total: items.length,
    items: picksFirst.slice(0, limit).map((item) => ({
      key: item.key,
      headline: item.headline,
      sourceName: item.sourceName,
      team: item.drivers[0]?.team ?? null,
      affectsPicks: item.affectsSessions.length > 0,
    })),
  };
}

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
 * Pick-related items name affected sessions. General items pass an empty array
 * and can still be selected for the feed or write-up independently.
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
    category: v.optional(
      v.union(v.literal('pick_related'), v.literal('general')),
    ),
    feedSelected: v.optional(v.boolean()),
    writeUpSelected: v.optional(v.boolean()),
    sourceName: v.string(),
    sourceUrl: v.string(),
    /**
     * Driver codes the item is about, e.g. `["ANT"]`. Optional: news about a
     * team, a circuit or the weather belongs to no driver.
     */
    driverCodes: v.optional(v.array(v.string())),
    writeUpImage: v.optional(raceNewsWriteUpImageValidator),
    /**
     * The confirmed starting grid, on the item that announces it, as
     * `[{"position":1,"code":"GAS"},{"position":2,"code":"RUS","note":"..."}]`.
     *
     * Publish the whole grid or none of it: positions must run 1 to N with no
     * gaps and no repeats, and every code is checked against the roster. A
     * partial grid renders as a perfectly tidy table with somebody's driver
     * missing from it, which is the one failure nobody would notice.
     *
     * `note` is why a driver is not where qualifying left them, e.g.
     * `3-place penalty`. Leave it off for a driver who starts where they
     * qualified.
     */
    startingGrid: v.optional(raceNewsStartingGridValidator),
    /**
     * Hold the feed card until this moment (ms epoch). The write-up page shows
     * the item immediately either way, which is the point: news for a later
     * round earns its SEO the day it breaks, while the feed stays about the
     * weekend the reader is picking. Omit for news about the current weekend.
     */
    feedVisibleAt: v.optional(v.number()),
    /**
     * When the source published the story (ms epoch), which the write-up page
     * shows beside the source name.
     *
     * Worth setting on every item: the write-up page is read long after the
     * weekend by someone who wants to know when a penalty was handed down, and
     * `publishedAt` can only tell them when we ran. Omit it rather than guess
     * when the source carries no date.
     */
    sourcePublishedAt: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    const race = await raceBySlug(ctx, args.raceSlug);
    if (!race) {
      throw new ConvexError(
        `No race with slug "${args.raceSlug}". Check the slug against the calendar.`,
      );
    }
    const problem = validatePublishInput({
      raceName: race.name,
      hasSprint: Boolean(race.hasSprint),
      affectsSessions: args.affectsSessions,
      category: args.category,
      sourceUrl: args.sourceUrl,
      sourcePublishedAt: args.sourcePublishedAt,
      now: Date.now(),
    });
    if (problem) {
      throw new ConvexError(problem);
    }

    // Resolved before the write so a typo fails at publish with a message
    // naming the bad code, rather than publishing an item whose badge silently
    // never renders. An agent re-running this needs the failure to be loud.
    const resolved = await resolveDriverCodes(ctx, args.driverCodes);
    const driverCodes = resolved?.codes;
    const grid = await resolveGridForPublish(
      ctx,
      race,
      args.key,
      args.startingGrid,
      { dryRun },
    );

    const existing = await newsByKey(ctx, race._id, args.key);
    const feedSelected = args.feedSelected ?? existing?.feedSelected ?? true;
    const writeUpSelected =
      args.writeUpSelected ?? existing?.writeUpSelected ?? true;
    if (!feedSelected && !writeUpSelected) {
      throw new ConvexError('Select feed, write-up, or both.');
    }
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
      feedSelected &&
      !alreadyInFeed &&
      feedVisibleAt !== undefined &&
      feedVisibleAt > now;

    if (dryRun) {
      return {
        dryRun: true,
        action,
        feedVisibleAt: heldBack ? feedVisibleAt : undefined,
        // Echoed as a date rather than the epoch that was passed in. A wrong
        // but well-formed timestamp is the one mistake validation cannot catch,
        // and nobody proof-reads 1788680139597.
        sourcePublished: isoDay(args.sourcePublishedAt),
        gridNewsLinks: grid?.resolved.filter((entry) => entry.newsKey).length,
        race: { slug: race.slug, name: race.name, round: race.round },
        key: args.key,
        headline: args.headline,
        affectsSessions: args.affectsSessions,
        driverCodes,
        gridPositions: grid?.resolved.length,
        // Must be empty before the real run: each entry is a row linking to a
        // story that is not live on this race yet.
        missingNewsKeys: grid?.missingNewsKeys,
      };
    }

    const fields = {
      raceId: race._id,
      key: args.key,
      headline: args.headline,
      body: args.body,
      affectsSessions: args.affectsSessions,
      category: args.category ?? 'pick_related',
      feedSelected,
      writeUpSelected,
      ...(!feedSelected ? { feedReleaseScheduledId: undefined } : {}),
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
      // Spread for the same reason the photo is: a correction to the copy on
      // the grid item should not have to restate 22 rows to keep them.
      ...(grid !== undefined ? { startingGrid: grid.stored } : {}),
      ...(args.feedVisibleAt !== undefined
        ? { feedVisibleAt: args.feedVisibleAt }
        : {}),
      // Spread like the photo and the grid: a correction to the copy should not
      // have to restate the source's date to keep it.
      ...(args.sourcePublishedAt !== undefined
        ? { sourcePublishedAt: args.sourcePublishedAt }
        : {}),
      active: true,
      updatedAt: now,
    };

    if (existing) {
      if (!feedSelected && existing.feedReleaseScheduledId) {
        try {
          await ctx.scheduler.cancel(
            existing.feedReleaseScheduledId as Id<'_scheduled_functions'>,
          );
        } catch {
          /* Already ran. */
        }
      }
      await ctx.db.patch(existing._id, {
        ...fields,
        ...(existing.headline !== args.headline
          ? { headlineUpdatedAt: now }
          : {}),
      });
    } else {
      await ctx.db.insert('raceNews', { ...fields, publishedAt: now });
    }

    if (!feedSelected) {
      const oldFeed = await feedEventForNews(ctx, race._id, args.key);
      if (oldFeed) {
        await ctx.db.delete(oldFeed._id);
      }
    } else if (heldBack) {
      await scheduleFeedRelease(ctx, race._id, args.key, feedVisibleAt);
    } else {
      await syncFeedEvent(
        ctx,
        race,
        args,
        resolved?.drivers,
        grid?.resolved,
        now,
      );
    }

    return {
      action,
      race: { slug: race.slug, name: race.name, round: race.round },
      key: args.key,
      headline: args.headline,
      affectsSessions: args.affectsSessions,
      driverCodes,
      gridPositions: grid?.resolved.length,
      feedVisibleAt: heldBack ? feedVisibleAt : undefined,
      gridNewsLinks: grid?.resolved.filter((entry) => entry.newsKey).length,
      sourcePublished: isoDay(
        args.sourcePublishedAt ?? existing?.sourcePublishedAt,
      ),
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

    if (!row.active || row.feedSelected === false) {
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

    const gridRoster = await driversForCodes(
      ctx,
      (row.startingGrid ?? []).map((entry) => entry.code),
    );
    const grid = row.startingGrid
      ? resolveStartingGrid(row.startingGrid, (code) => gridRoster.get(code))
      : undefined;

    await syncFeedEvent(ctx, race, row, drivers, grid, Date.now());

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
    throw new ConvexError(
      `Unknown driver ${unknown.length === 1 ? 'code' : 'codes'}: ${unknown.join(', ')}. Use the three-letter code from the roster, e.g. ANT.`,
    );
  }
  return { codes: normalised, drivers };
}

/**
 * The grid rows whose `newsKey` is not an active item on this race, plus the
 * keys that are, for the error message.
 */
async function findMissingGridNewsKeys(
  ctx: MutationCtx,
  race: { _id: Id<'races'>; slug: string },
  ownKey: string,
  entries: StartingGridEntry[],
): Promise<{ missing: MissingGridNewsKey[]; activeKeys: string[] }> {
  const linked = entries.filter((entry) => entry.newsKey);
  if (linked.length === 0) {
    return { missing: [], activeKeys: [] };
  }

  // The grid explaining itself would be a row linking to the page it is on.
  if (linked.some((entry) => entry.newsKey === ownKey)) {
    throw new ConvexError(
      `A grid row points at "${ownKey}", which is the item carrying the grid. ` +
        'Point it at the story that explains the row.',
    );
  }

  const published = await ctx.db
    .query('raceNews')
    .withIndex('by_race', (q) => q.eq('raceId', race._id))
    .take(MAX_NEWS_PER_RACE);
  const activeByKey = new Map(published.map((row) => [row.key, row.active]));
  const missing = linked.flatMap((entry) => {
    const newsKey = entry.newsKey as string;
    const active = activeByKey.get(newsKey);
    if (active === true) {
      return [];
    }
    return [
      {
        position: entry.position,
        code: entry.code.toUpperCase(),
        newsKey,
        // The fixes differ: a retracted story needs republishing, an
        // unpublished key is a wrong order or a typo.
        reason:
          active === false ? ('retracted' as const) : ('unpublished' as const),
      },
    ];
  });
  const activeKeys = published
    .filter((row) => row.active)
    .map((row) => row.key);
  return { missing, activeKeys };
}

type MissingGridNewsKey = {
  position: number;
  code: string;
  newsKey: string;
  reason: 'unpublished' | 'retracted';
};

/**
 * Refuse a grid that points at a story this weekend does not have.
 *
 * The same loudness as an unknown driver code, and for the same reason: a row
 * whose link goes nowhere looks exactly like every other row until somebody
 * taps it. Checked against active items only, so retracting a penalty story
 * cannot leave the grid quietly linking to it.
 *
 * A `ConvexError`, because this is an operator mistake with a clear fix, not a
 * fault: a plain `Error` reaches Sentry as an uncaught production failure.
 */
function missingGridNewsKeysError(
  race: { slug: string },
  missing: MissingGridNewsKey[],
  activeKeys: string[],
) {
  function describe(reason: MissingGridNewsKey['reason']) {
    return missing
      .filter((row) => row.reason === reason)
      .map((row) => `P${row.position} ${row.code} -> "${row.newsKey}"`)
      .join(', ');
  }
  const unpublished = describe('unpublished');
  const retracted = describe('retracted');
  const message = [
    unpublished &&
      `No active news item on ${race.slug} for ${unpublished}. ` +
        'Publish that story first (or fix the key), then re-run the grid.',
    retracted &&
      `Retracted on ${race.slug}: ${retracted}. Republish the story or drop the link.`,
    `Active keys: ${activeKeys.length > 0 ? activeKeys.join(', ') : 'none'}.`,
  ]
    .filter(Boolean)
    .join(' ');
  return new ConvexError({
    code: 'GRID_NEWS_KEY_MISSING',
    message,
    missing,
    activeKeys,
  });
}

/**
 * Check a grid before it is written, and resolve it for the feed snapshot.
 *
 * Both halves come back: the normalised rows to store (codes uppercased, the
 * way `resolveDriverCodes` normalises a badge code) and the resolved rows the
 * feed event freezes. Doing it once here is what stops the stored grid and the
 * feed's copy of it disagreeing about who is on it.
 */
async function resolveGridForPublish(
  ctx: MutationCtx,
  race: { _id: Id<'races'>; slug: string },
  ownKey: string,
  entries: StartingGridEntry[] | undefined,
  { dryRun }: { dryRun: boolean },
): Promise<
  | {
      stored: StartingGridEntry[];
      resolved: ResolvedStartingGridEntry[];
      missingNewsKeys: MissingGridNewsKey[];
    }
  | undefined
> {
  if (entries === undefined) {
    return undefined;
  }
  const problem = validateStartingGrid(entries);
  if (problem) {
    throw new ConvexError(problem);
  }

  // Throws on an unknown code, naming it. A grid is 22 codes typed in one go,
  // which is 22 chances to fat-finger one, and the row that would result looks
  // exactly like every other row on the page.
  const resolved = await resolveDriverCodes(
    ctx,
    entries.map((entry) => entry.code),
  );
  const byCode = new Map(
    (resolved?.drivers ?? []).map((driver) => [driver.code, driver]),
  );
  // A dry run reports every missing link alongside the rest of the preview,
  // so the order problem shows up before the real call does.
  const { missing: missingNewsKeys, activeKeys } =
    await findMissingGridNewsKeys(ctx, race, ownKey, entries);
  if (missingNewsKeys.length > 0 && !dryRun) {
    throw missingGridNewsKeysError(race, missingNewsKeys, activeKeys);
  }

  const stored = sortStartingGrid(
    entries.map((entry) => ({
      position: entry.position,
      code: entry.code.toUpperCase(),
      ...(entry.note !== undefined ? { note: entry.note } : {}),
      ...(entry.newsKey !== undefined ? { newsKey: entry.newsKey } : {}),
    })),
  );

  return {
    stored,
    resolved: resolveStartingGrid(stored, (code) => byCode.get(code)),
    missingNewsKeys,
  };
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
    category?: 'pick_related' | 'general';
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
  startingGrid: ResolvedStartingGridEntry[] | undefined,
  now: number,
) {
  const shared = {
    newsHeadline: args.headline,
    newsCategory: args.category ?? 'pick_related',
    newsBody: args.body,
    newsAffectsSessions:
      args.affectsSessions as Doc<'feedEvents'>['newsAffectsSessions'],
    newsSourceName: args.sourceName,
    newsSourceUrl: args.sourceUrl,
    newsDrivers: drivers,
    newsStartingGrid: startingGrid,
    raceName: race.name,
    raceSlug: race.slug,
    season: race.season,
  };

  const existing = await feedEventForNews(ctx, race._id, args.key);
  if (existing) {
    await ctx.db.patch(existing._id, shared);
    return;
  }

  const feedEventId = await insertFeedEvent(ctx, {
    type: 'race_news',
    raceId: race._id,
    newsKey: args.key,
    ...shared,
    createdAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.discord.postNews, {
    headline: args.headline,
    sourceName: args.sourceName,
    feedEventId,
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
      throw new ConvexError(`No race with slug "${args.raceSlug}".`);
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

/**
 * Move items filed against the wrong race to the race they are about.
 *
 * The case this exists for: a post-race story from Baku was filed against
 * Bahrain because Bahrain was the upcoming weekend when the agent ran. Retract
 * plus republish would fix the row, but a republish inserts a new feed event,
 * and a new feed event posts to Discord, so the same story would go out twice.
 * This changes the race in place instead. The feed event keeps its id and its
 * `createdAt`, and only `feedSort` is recomputed, so the card moves into its
 * own weekend's block.
 *
 * Retracted items move too, so the audit trail sits on the right race.
 *
 * Refuses the whole call, before any write, when the target already has one of
 * the keys, when an item names a session the target weekend does not run, when
 * an embargoed release is still scheduled, or when an item carries a starting
 * grid or is linked from one. Those cases need a person, not a move.
 *
 * Run with `dryRun: true` first.
 *
 * Run via:
 *   npx convex run --prod raceNews:move '{
 *     "fromRaceSlug": "bahrain-2026",
 *     "toRaceSlug": "azerbaijan-2026",
 *     "keys": ["piastri-baku-lockup"],
 *     "dryRun": true
 *   }'
 */
export const move = internalMutation({
  args: {
    fromRaceSlug: v.string(),
    toRaceSlug: v.string(),
    keys: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    action: v.union(v.literal('dry_run'), v.literal('moved')),
    from: v.string(),
    to: v.string(),
    items: v.array(
      v.object({
        key: v.string(),
        headline: v.string(),
        active: v.boolean(),
        feedEvent: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    if (args.fromRaceSlug === args.toRaceSlug) {
      throw new ConvexError('fromRaceSlug and toRaceSlug are the same race.');
    }
    if (args.keys.length === 0) {
      throw new ConvexError('Name at least one key to move.');
    }
    const from = await raceBySlug(ctx, args.fromRaceSlug);
    if (!from) {
      throw new ConvexError(`No race with slug "${args.fromRaceSlug}".`);
    }
    const to = await raceBySlug(ctx, args.toRaceSlug);
    if (!to) {
      throw new ConvexError(`No race with slug "${args.toRaceSlug}".`);
    }

    // Keys linked from a starting grid on the source race: moving one would
    // leave the grid row pointing at nothing.
    const gridLinked = new Set<string>();
    const sourceRows = await ctx.db
      .query('raceNews')
      .withIndex('by_race', (q) => q.eq('raceId', from._id))
      .take(MAX_NEWS_PER_RACE);
    for (const row of sourceRows) {
      for (const entry of row.startingGrid ?? []) {
        if (entry.newsKey !== undefined) {
          gridLinked.add(entry.newsKey);
        }
      }
    }

    const weekend = sessionsForWeekend(Boolean(to.hasSprint));
    const planned: {
      row: Doc<'raceNews'>;
      event: Doc<'feedEvents'> | null;
    }[] = [];
    for (const key of new Set(args.keys)) {
      const row = await newsByKey(ctx, from._id, key);
      if (!row) {
        throw new ConvexError(
          `${from.name} has no news item with key "${key}".`,
        );
      }
      if (await newsByKey(ctx, to._id, key)) {
        throw new ConvexError(
          `${to.name} already has a news item with key "${key}".`,
        );
      }
      const offWeekend = row.affectsSessions.filter(
        (session) => !weekend.includes(session),
      );
      if (offWeekend.length > 0) {
        throw new ConvexError(
          `"${key}" names ${offWeekend.join(', ')}, which ${to.name} does not run.`,
        );
      }
      if (row.feedReleaseScheduledId) {
        throw new ConvexError(
          `"${key}" has a scheduled feed release. Publish it without an embargo, or retract it, before moving.`,
        );
      }
      if (row.startingGrid || gridLinked.has(key)) {
        throw new ConvexError(
          `"${key}" carries or is linked from a starting grid. Move it by hand.`,
        );
      }
      planned.push({ row, event: await feedEventForNews(ctx, from._id, key) });
    }

    const items = planned.map(({ row, event }) => ({
      key: row.key,
      headline: row.headline,
      active: row.active,
      feedEvent: event !== null,
    }));
    if (args.dryRun) {
      return {
        action: 'dry_run' as const,
        from: from.slug,
        to: to.slug,
        items,
      };
    }

    const now = Date.now();
    for (const { row, event } of planned) {
      await ctx.db.patch(row._id, { raceId: to._id, updatedAt: now });
      if (event) {
        await ctx.db.patch(event._id, {
          raceId: to._id,
          raceName: to.name,
          raceSlug: to.slug,
          season: to.season,
          feedSort: await feedSortFor(ctx, {
            raceId: to._id,
            createdAt: event.createdAt,
          }),
        });
      }
    }

    return { action: 'moved' as const, from: from.slug, to: to.slug, items };
  },
});
