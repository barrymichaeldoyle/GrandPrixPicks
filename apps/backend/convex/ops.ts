import { v } from 'convex/values';

import { getSessionsForWeekend } from '@grandprixpicks/shared/sessions';
import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { internalQuery } from './_generated/server';
import { getSessionLockAt } from './feed';
import {
  loadCurrentLockedRace,
  loadNextUpcomingRace,
} from './lib/calendarRaces';

/**
 * Operator views for the `gpp` CLI (`scripts/gpp.mjs`).
 *
 * Each one answers a question an operator or an agent asks every weekend, in
 * the fewest fields that answer it. The full documents are still a
 * `convex run` away; these exist so the common check costs a few lines of
 * output instead of a few thousand characters.
 */

// Matches `races.getQuickPickRace`: a locked weekend stays "current" until
// three days after its lock, so the view does not jump ahead on Sunday night.
const LOCKED_WEEKEND_GRACE_MS = 72 * 60 * 60 * 1000;

// Bounds every per-session count. A weekend has tens of pickers today; the cap
// only matters if that changes, and the CLI prints `5000+` when it is hit.
const COUNT_CAP = 5000;

async function resolveRace(
  ctx: QueryCtx,
  raceSlug: string | undefined,
): Promise<Doc<'races'> | null> {
  if (raceSlug !== undefined) {
    return await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', raceSlug))
      .unique();
  }
  const now = Date.now();
  return (
    (await loadCurrentLockedRace(ctx, now, LOCKED_WEEKEND_GRACE_MS)) ??
    (await loadNextUpcomingRace(ctx, now))
  );
}

/**
 * One weekend at a glance: sessions, locks, pickers, results, news.
 *
 * Omit `raceSlug` for the weekend players are on now (the locked one inside
 * its grace window, otherwise the next upcoming race).
 */
export const raceState = internalQuery({
  args: { raceSlug: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const race = await resolveRace(ctx, args.raceSlug);
    if (!race) {
      return null;
    }

    const sessions = [];
    for (const sessionType of getSessionsForWeekend(Boolean(race.hasSprint))) {
      let top5 = 0;
      for await (const _ of ctx.db
        .query('predictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', race._id).eq('sessionType', sessionType),
        )) {
        top5 += 1;
        if (top5 >= COUNT_CAP) {
          break;
        }
      }

      const h2hUsers = new Set<string>();
      for await (const pick of ctx.db
        .query('h2hPredictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', race._id).eq('sessionType', sessionType),
        )) {
        h2hUsers.add(pick.userId);
        if (h2hUsers.size >= COUNT_CAP) {
          break;
        }
      }

      const result = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', race._id).eq('sessionType', sessionType),
        )
        .first();

      let scored = 0;
      if (result) {
        for await (const _ of ctx.db
          .query('scores')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )) {
          scored += 1;
          if (scored >= COUNT_CAP) {
            break;
          }
        }
      }

      sessions.push({
        session: sessionType,
        lockAt: getSessionLockAt(race, sessionType) ?? null,
        top5Pickers: top5,
        h2hPickers: h2hUsers.size,
        result: result
          ? {
              publishedAt: result.publishedAt,
              scoringStatus: result.scoringStatus ?? null,
              scored,
              amendedAt: result.amendedAt ?? null,
              nextRecheckAt: result.nextRecheckAt ?? null,
              lastRecheckError: result.lastRecheckError ?? null,
            }
          : null,
      });
    }

    let newsActive = 0;
    let newsRetracted = 0;
    let newsHeld = 0;
    const now = Date.now();
    for await (const item of ctx.db
      .query('raceNews')
      .withIndex('by_race', (q) => q.eq('raceId', race._id))) {
      if (!item.active) {
        newsRetracted += 1;
        continue;
      }
      newsActive += 1;
      if (item.feedVisibleAt !== undefined && item.feedVisibleAt > now) {
        newsHeld += 1;
      }
    }

    return {
      slug: race.slug,
      name: race.name,
      round: race.round,
      season: race.season,
      status: race.status,
      hasSprint: Boolean(race.hasSprint),
      timeZone: race.timeZone ?? null,
      raceStartAt: race.raceStartAt,
      sessions,
      news: { active: newsActive, retracted: newsRetracted, held: newsHeld },
    };
  },
});

/**
 * Every news item on a race, one compact row each, retracted included.
 *
 * Carries what `raceNews:list` leaves out (category, surface flags, held
 * feed release) and leaves out what a duplicate check never needs (resolved
 * driver records, grid rows, image metadata). Pass `key` for that one item in
 * full, as stored.
 */
export const newsList = internalQuery({
  args: { raceSlug: v.string(), key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const race = await resolveRace(ctx, args.raceSlug);
    if (!race) {
      return null;
    }
    const raceSummary = { slug: race.slug, name: race.name, round: race.round };

    if (args.key !== undefined) {
      const key = args.key;
      const item = await ctx.db
        .query('raceNews')
        .withIndex('by_race_key', (q) =>
          q.eq('raceId', race._id).eq('key', key),
        )
        .unique();
      return { race: raceSummary, items: [], item };
    }

    const items = [];
    for await (const item of ctx.db
      .query('raceNews')
      .withIndex('by_race', (q) => q.eq('raceId', race._id))) {
      items.push({
        key: item.key,
        headline: item.headline,
        category: item.category ?? 'pick_related',
        affectsSessions: item.affectsSessions,
        driverCodes: item.driverCodes ?? [],
        active: item.active,
        feedSelected: item.feedSelected ?? true,
        writeUpSelected: item.writeUpSelected ?? true,
        feedVisibleAt: item.feedVisibleAt ?? null,
        sourceName: item.sourceName,
        sourcePublishedAt: item.sourcePublishedAt ?? null,
        publishedAt: item.publishedAt,
        gridRows: item.startingGrid?.length ?? 0,
        hasImage: item.writeUpImage !== undefined,
      });
    }
    items.sort((a, b) => a.publishedAt - b.publishedAt);
    return { race: raceSummary, items, item: null };
  },
});
