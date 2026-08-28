import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, query } from './_generated/server';

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

/**
 * What is already published for a weekend.
 *
 * Run this first. The `key` makes a repeat publish safe, but this is what stops
 * an agent needing to guess whether it already ran, which is the actual cause
 * of duplicates.
 *
 * Run via:
 *   npx convex run --prod raceNews:list '{"raceSlug":"italy-2026"}'
 */
export const list = query({
  args: { raceSlug: v.string(), includeRetracted: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const race = await raceBySlug(ctx, args.raceSlug);
    if (!race) {
      return { race: null, items: [] };
    }

    const rows = await ctx.db
      .query('raceNews')
      .withIndex('by_race', (q) => q.eq('raceId', race._id))
      .take(MAX_NEWS_PER_RACE);

    const visible = (
      args.includeRetracted ? rows : rows.filter((r) => r.active)
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
    }));

    return {
      race: { slug: race.slug, name: race.name, round: race.round },
      items,
    };
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

    if (dryRun) {
      return {
        dryRun: true,
        action,
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
      active: true,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert('raceNews', { ...fields, publishedAt: now });
    }

    await syncFeedEvent(ctx, race, args, resolved?.drivers, now);

    return {
      action,
      race: { slug: race.slug, name: race.name, round: race.round },
      key: args.key,
      headline: args.headline,
      affectsSessions: args.affectsSessions,
      driverCodes,
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

    await ctx.db.patch(existing._id, { active: false, updatedAt: Date.now() });
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
