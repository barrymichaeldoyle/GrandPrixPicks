import { api } from '@convex-generated/api';

import { parseNewsListQuery, serveKeyed } from '../../../../lib/newsApi';

type RouteEvent = {
  req: Request;
};

/**
 * `GET /api/v1/news`: published news, newest first, or the change feed when
 * `updated_since` or a change-feed cursor is given. Contract:
 * `docs/news-api.md`.
 *
 * The key is checked by the Convex action, not here: it is the public entry
 * point, so a check in this file alone would be a door beside an open wall.
 */
export default async function handler(event: RouteEvent) {
  return await serveKeyed(
    event.req,
    'newsApi.list',
    (url) => parseNewsListQuery(url.searchParams),
    (convex, apiKey, query) =>
      convex.action(api.newsApiServe.list, { apiKey, ...query }),
    (result) => ({
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    }),
  );
}
