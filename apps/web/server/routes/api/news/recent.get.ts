import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { captureServerException, startServerSpan } from '../../../lib/sentry';

/**
 * The last two weeks of news cards, for the r/GPPicks app
 * (`apps/reddit-news`, see `docs/reddit-news-app.md`).
 *
 * Public and viewer-free: every item is in the site's feed already. The window
 * is fixed rather than a query parameter, so the edge keeps one cache entry
 * and the app's "dropped off the list means retracted" rule has a window it
 * can rely on.
 *
 * On failure this answers 503 rather than an empty list. The app never deletes
 * on an empty list anyway, but it should not be asked to tell the difference.
 */
export default async function handler() {
  try {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);
    const items = await startServerSpan({ name: 'news.recent' }, () =>
      convex.query(api.feed.recentNews, { days: 14 }),
    );

    return new Response(JSON.stringify({ items }), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'news.recent' });
    console.error('[api/news/recent] failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }
}
