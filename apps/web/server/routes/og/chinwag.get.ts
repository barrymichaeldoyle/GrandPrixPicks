import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { chinwagCardTemplate } from '../../../src/lib/og/chinwagCard';
import { renderOgImage } from '../../../src/lib/og/renderer';
import { captureServerException, startServerSpan } from '../../lib/sentry';

/**
 * The creator poll's link preview.
 *
 * Short cache on purpose. The card carries the running vote count and flips
 * from predictions to Bangers & Clangers when the race finishes, so unlike the
 * site's own cards this one is meant to go stale quickly. Scrapers will still
 * hold their copy for as long as they like; that is fine, because every state
 * it can be caught in is a true one.
 *
 * Any failure serves nothing rather than a broken image: a preview that fails
 * to load under his post costs more than no preview at all.
 */
export default async function handler() {
  return await startServerSpan({ name: 'og.chinwag' }, async () => {
    try {
      const convexUrl = process.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error('Missing VITE_CONVEX_URL');
      }

      const convex = new ConvexHttpClient(convexUrl);
      const poll = await convex.query(api.creatorPolls.getPoll, {
        slug: 'chinwag',
      });

      if (!poll) {
        return new Response(null, { status: 404 });
      }

      const results = await convex.query(api.creatorPolls.getResults, {
        slug: 'chinwag',
      });

      const png = await renderOgImage(
        chinwagCardTemplate({
          phase: poll.phase,
          raceName: poll.race.name,
          round: poll.race.round,
          votes: results?.totalVotes ?? null,
        }),
      );

      return new Response(png as BodyInit, {
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=300, s-maxage=300',
        },
      });
    } catch (error) {
      captureServerException(error, {
        name: 'og.chinwag',
        tags: { route: '/og/chinwag' },
      });
      return new Response(null, { status: 500 });
    }
  });
}
