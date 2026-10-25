import { api } from '@convex-generated/api';

import { getRaceWriteup } from '../../src/lib/raceWriteups';
import { captureServerException } from './sentry';
import { socialRedirect } from './socialRedirect';
import { getServerConvexClient } from './convex';

/**
 * Redirects a campaign link to this weekend: its write-up when it has one,
 * otherwise its race page. For links that are posted once and left in place,
 * like a profile bio, so the same URL is still current next round.
 *
 * `getQuickPickRace` rather than `getNextRace`, because the latter moves on to
 * the following round as soon as Friday's first session locks, and a bio link
 * should spend the weekend on the race being run.
 *
 * The campaign's query string is carried over unchanged, so attribution does
 * not depend on where the link lands. Between seasons, or if Convex cannot be
 * reached, it lands on the campaign's own path (the home page): a working
 * link to the wrong page is better than a failed one in a bio.
 */
export async function currentWeekendRedirect(campaign: string) {
  const target = new URL(campaign, 'https://grandprixpicks.invalid');
  try {
    const race = await getServerConvexClient().query(
      api.races.getQuickPickRace,
      {},
    );
    if (race) {
      target.pathname = getRaceWriteup(race.slug)?.to ?? `/races/${race.slug}`;
    }
  } catch (error) {
    captureServerException(error, { name: 'social.current_weekend' });
  }
  return socialRedirect(`${target.pathname}${target.search}`, {
    // The weekend changes under this link, so a browser must not hold an old
    // answer for long.
    maxAge: 300,
  });
}
