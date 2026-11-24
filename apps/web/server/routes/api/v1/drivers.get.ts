import { api } from '@convex-generated/api';

import { parseNoParams, serveKeyed } from '../../../lib/newsApi';

type RouteEvent = {
  req: Request;
};

/**
 * `GET /api/v1/drivers`: the codes the news list's `driver` filter takes,
 * with each driver's current team. Keyed and counted like the news. Contract:
 * `docs/news-api.md`.
 */
export default async function handler(event: RouteEvent) {
  return await serveKeyed(
    event.req,
    'newsApi.drivers',
    (url) => parseNoParams(url.searchParams),
    (convex, apiKey) => convex.action(api.newsApiServe.drivers, { apiKey }),
    (result) => ({ data: result.data }),
  );
}
