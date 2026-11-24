import { api } from '@convex-generated/api';

import { parseNewsItemRequest, serveKeyed } from '../../../../lib/newsApi';

type RouteEvent = {
  req: Request;
};

/**
 * `GET /api/v1/news/:id`: one story. A retracted one answers 200 with
 * `status: "retracted"`, the same record the change feed reports. Contract:
 * `docs/news-api.md`.
 *
 * `/api/v1/news/sample` is its own route file, and the router matches a
 * static segment before this parameter, so "sample" never reaches here.
 */
export default async function handler(event: RouteEvent) {
  return await serveKeyed(
    event.req,
    'newsApi.get',
    parseNewsItemRequest,
    (convex, apiKey, { id, lang }) =>
      convex.action(api.newsApiServe.get, { apiKey, id, lang }),
    (result) => ({ data: result.data }),
  );
}
