import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import {
  ANTONELLI_MONZA_PENALTY_BODY,
  ARON_MONZA_FP1_BODY,
  BROWNING_WILLIAMS_FP1_BODY,
  COLAPINTO_ALPINE_UPGRADE_BODY,
  FERRARI_ENGINE_UPGRADE_BODY,
  HADJAR_DUTCH_GP_LINEUP_NOTE,
  HADJAR_MONZA_ABSENCE_BODY,
  HERTA_MONZA_FP1_BODY,
  IWASA_MONZA_FP1_BODY,
  MERCEDES_MONZA_TOW_BODY,
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
 * Publish the settled Monza replacement line-up, separate Verstappen's FP1
 * rookie handover from the race grid, and retire the stale "expected back"
 * sentence on the original Zandvoort line-up event. Idempotent.
 */
export const publishItaly2026HadjarUpdate = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'hadjar-misses-monza',
      headline: 'Hadjar misses Monza; Lawson and Tsunoda stay in',
      body: HADJAR_MONZA_ABSENCE_BODY,
      affectsSessions: ['quali', 'race'],
      driverCodes: ['HAD', 'LAW', 'TSU'],
      sourceName: 'Autosport',
      sourceUrl:
        'https://www.autosport.com/f1/news/red-bull-to-keep-dutch-gp-driver-line-up-for-monza/10851595/',
    });

    await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'iwasa-red-bull-fp1',
      headline: 'Iwasa replaces Verstappen for Monza FP1',
      body: IWASA_MONZA_FP1_BODY,
      affectsSessions: ['quali', 'race'],
      driverCodes: ['VER'],
      sourceName: 'Autosport',
      sourceUrl:
        'https://www.autosport.com/f1/news/red-bull-to-keep-dutch-gp-driver-line-up-for-monza/10851595/',
    });

    await ctx.runMutation(internal.feed.writeLineupChangeFeedEvent, {
      season: 2026,
      round: 12,
      note: HADJAR_DUTCH_GP_LINEUP_NOTE,
    });

    return null;
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

/**
 * The Cadillac and Alpine FP1 seats, which landed after the other Monza items
 * had already been published.
 *
 * Both were first published by hand through `raceNews:publish`, which is the
 * designed authoring surface (see `docs/race-news.md`) and is why this
 * migration is a mirror rather than the original act. It exists so the two are
 * reproducible from code like the other five: a deploy replays them as a no-op,
 * and prod rebuilt from scratch comes back with all seven rather than five.
 *
 * That makes the copy here the source of truth. Editing a body in
 * `italy2026MonzaNewsCopy.ts` republishes it on the next deploy; editing it in
 * prod by hand is undone by the same deploy. Idempotent either way, because
 * `raceNews.publish` upserts on `(raceId, key)`.
 */
export const publishItaly2026MonzaFp1Seats = internalMutation({
  args: {},
  // Annotated for the same TS7022 reason as `updateItaly2026MonzaNewsCopy`
  // above: this module is part of `internal` and calls `internal.raceNews`.
  handler: async (ctx): Promise<{ herta: unknown; aron: unknown }> => {
    const herta = await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'herta-cadillac-fp1',
      headline: 'Herta drives Perez\u2019s Cadillac in FP1',
      body: HERTA_MONZA_FP1_BODY,
      affectsSessions: ['quali', 'race'],
      // Perez, not Herta: Herta is not on the roster and cannot be picked, and
      // the point of the item is who is in the car for everything that counts.
      driverCodes: ['PER'],
      sourceName: 'PlanetF1',
      sourceUrl:
        'https://www.planetf1.com/news/sergio-perez-colton-herta-italian-grand-prix-2026-fp1',
    });

    const aron = await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'aron-alpine-fp1',
      headline: 'Aron drives Gasly\u2019s Alpine in FP1',
      body: ARON_MONZA_FP1_BODY,
      affectsSessions: ['quali', 'race'],
      driverCodes: ['GAS'],
      sourceName: 'Formula 1',
      sourceUrl:
        'https://www.formula1.com/en/latest/article/aron-set-for-next-fp1-run-with-alpine-at-monza.3X5Psl55Co2cFyrpqwzrGt',
    });

    return { herta, aron };
  },
});

/**
 * The Mercedes and Williams items, plus the qualifying tow.
 *
 * The penalty and the Browning FP1 seat were published by hand and never
 * mirrored into code, so a deploy left them alone while the other five were
 * republished from `italy2026MonzaNewsCopy.ts`. Editing those two bodies
 * therefore behaved differently from editing any of the rest, which is the
 * kind of split that ends with prod and the repo quietly disagreeing. All
 * eight Monza items are reproducible from code now.
 *
 * `browning-williams-fp1` carries a photo. Republishing keeps it:
 * `raceNews.publish` omits `writeUpImage` from the patch when the caller does
 * not pass one, and `addItaly2026BrowningWriteUpPhoto` runs after this anyway.
 *
 * Idempotent, like the others.
 */
export const publishItaly2026MercedesAndWilliamsNews = internalMutation({
  args: {},
  // Annotated for the same TS7022 reason as `updateItaly2026MonzaNewsCopy`.
  handler: async (
    ctx,
  ): Promise<{ antonelli: unknown; tow: unknown; browning: unknown }> => {
    const antonelli = await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'antonelli-grid-penalty',
      headline: 'Antonelli is expected to start from the back at Monza',
      body: ANTONELLI_MONZA_PENALTY_BODY,
      affectsSessions: ['quali', 'race'],
      driverCodes: ['ANT', 'RUS'],
      sourceName: 'Motorsport.com',
      sourceUrl:
        'https://www.motorsport.com/f1/news/george-russell-also-set-for-f1-engine-penalty-but-mercedes-yet-to-decide-when/10850409/',
    });

    // Qualifying only, where the penalty item is qualifying and race: a tow
    // changes how to read Russell's lap and does nothing to Sunday.
    const tow = await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'mercedes-monza-qualifying-tow',
      headline: 'Antonelli will tow Russell in Monza qualifying',
      body: MERCEDES_MONZA_TOW_BODY,
      affectsSessions: ['quali'],
      // Russell first: his is the qualifying pick this changes, and his is the
      // lap the tow is for.
      driverCodes: ['RUS', 'ANT'],
      sourceName: 'Formula 1',
      sourceUrl:
        'https://www.formula1.com/en/latest/article/russell-insists-mercedes-will-work-as-a-team-in-monza-qualifying-before-antonelli-grid-penalty.3KS3yXktFxuX0VZ9c14Wzn',
    });

    const browning = await ctx.runMutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: BROWNING_NEWS_KEY,
      headline: 'Luke Browning drives Albon\u2019s Williams in FP1',
      body: BROWNING_WILLIAMS_FP1_BODY,
      affectsSessions: ['quali', 'race'],
      // Albon, not Browning: Browning is not on the roster and cannot be
      // picked, and the point of the item is who is in the car afterwards.
      driverCodes: ['ALB'],
      sourceName: 'GPFans',
      sourceUrl:
        'https://www.gpfans.com/en/f1-news/1089597/williams-f1-team-announce-alex-albon-driver-replacement-luke-browning-italian-grand-prix/',
    });

    return { antonelli, tow, browning };
  },
});
