import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import {
  COLAPINTO_ALPINE_UPGRADE_BODY,
  FERRARI_ENGINE_UPGRADE_BODY,
} from './lib/italy2026MonzaNewsCopy';
import {
  BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE,
  writeUpImageFieldsMatch,
} from './lib/raceNewsWriteUpImage';

const BROWNING_NEWS_KEY = 'browning-williams-fp1' as const;

const addItaly2026BrowningWriteUpPhotoResultValidator = v.object({
  action: v.union(v.literal('unchanged'), v.literal('updated')),
  key: v.literal(BROWNING_NEWS_KEY),
});

/**
 * Republish Barry-approved Monza write-up copy for the Alpine and Ferrari news
 * cards. Idempotent: safe to rerun on every deploy.
 */
export const updateItaly2026MonzaNewsCopy = internalMutation({
  args: {},
  // The return type is annotated rather than inferred. This module is part of
  // `internal`, and the handler calls `internal.raceNews.publish`, so inferring
  // it makes the type depend on itself: TS7022, and the backend then emits no
  // declarations at all. Every Convex query type in the web app degrades to
  // `{}` when that happens, which is a repo-wide typecheck failure traced back
  // to one missing annotation. Nothing reads these two values, so `unknown`
  // is the honest shape and keeps the cycle broken.
  handler: async (ctx): Promise<{ alpine: unknown; ferrari: unknown }> => {
    const alpine = await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'colapinto-alpine-upgrade',
      headline: "Colapinto gets Alpine's upgrade at Monza",
      body: COLAPINTO_ALPINE_UPGRADE_BODY,
      affectsSessions: ['quali', 'race'],
      driverCodes: ['COL', 'GAS'],
      sourceName: 'Formula 1',
      sourceUrl:
        'https://www.formula1.com/en/latest/article/how-alpines-dutch-gp-upgrades-have-propelled-gasly-to-the-front-of-the-midfield-battle.66MuOGDn4ewCtYgzQUUShR',
    });

    const ferrari = await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'ferrari-engine-upgrade-monza',
      headline: 'Ferrari brings its final engine upgrade to Monza',
      body: FERRARI_ENGINE_UPGRADE_BODY,
      affectsSessions: ['quali', 'race'],
      driverCodes: ['LEC', 'HAM'],
      sourceName: 'Motorsport.com',
      sourceUrl:
        'https://www.motorsport.com/f1/news/f1-ferrari-commits-to-new-aduo2-upgraded-067-6-engine-for-monza/10850142/',
    });

    return { alpine, ferrari };
  },
});

/**
 * Attach the Barry-approved Browning FP1 write-up photo without touching copy.
 * Idempotent: safe to rerun on every deploy.
 */
export const addItaly2026BrowningWriteUpPhoto = internalMutation({
  args: {},
  returns: addItaly2026BrowningWriteUpPhotoResultValidator,
  handler: async (ctx) => {
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'italy-2026'))
      .unique();
    if (!race) {
      throw new Error('italy-2026 race not found');
    }

    const existing = await ctx.db
      .query('raceNews')
      .withIndex('by_race_key', (q) =>
        q.eq('raceId', race._id).eq('key', BROWNING_NEWS_KEY),
      )
      .unique();
    if (!existing) {
      // Loud, because the deploy runner only fails on a non-zero exit: a
      // returned `not_found` would print into the build log and go green, and
      // the photo would silently never appear. Retraction sets `active: false`
      // rather than deleting, so the row survives anything short of a hand
      // deletion and this cannot start failing deploys on its own.
      throw new Error(
        `No italy-2026 news item with key "${BROWNING_NEWS_KEY}". Publish it before attaching the photo.`,
      );
    }

    const image = BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE;
    if (writeUpImageFieldsMatch(existing.writeUpImage, image)) {
      return { action: 'unchanged' as const, key: BROWNING_NEWS_KEY };
    }

    await ctx.db.patch(existing._id, {
      writeUpImage: image,
      updatedAt: Date.now(),
    });

    return { action: 'updated' as const, key: BROWNING_NEWS_KEY };
  },
});
