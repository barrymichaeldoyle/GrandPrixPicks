import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import {
  COLAPINTO_ALPINE_UPGRADE_BODY,
  FERRARI_ENGINE_UPGRADE_BODY,
} from './lib/italy2026MonzaNewsCopy';

/**
 * Republish Barry-approved Monza write-up copy for the Alpine and Ferrari news
 * cards. Idempotent: safe to rerun on every deploy.
 */
export const updateItaly2026MonzaNewsCopy = internalMutation({
  args: {},
  handler: async (ctx) => {
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
