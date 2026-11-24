import { api } from '@convex-generated/api';

import { parseRacesQuery, serveKeyed } from '../../../lib/newsApi';

type RouteEvent = {
  req: Request;
};

/**
 * `GET /api/v1/races`: the race slugs the news list's `race` filter takes,
 * in calendar order, optionally for one `season`. Keyed and counted like the
 * news. Contract: `docs/news-api.md`.
 */
export default async function handler(event: RouteEvent) {
  return await serveKeyed(
    event.req,
    'newsApi.races',
    (url) => parseRacesQuery(url.searchParams),
    (convex, apiKey, query) =>
      convex.action(api.newsApiServe.races, { apiKey, ...query }),
    (result) => ({ data: result.data }),
  );
}
