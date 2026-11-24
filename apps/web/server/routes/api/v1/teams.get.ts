import { api } from '@convex-generated/api';

import {
  NEWS_API_TEAMS,
  parseNoParams,
  serveKeyed,
} from '../../../lib/newsApi';

type RouteEvent = {
  req: Request;
};

/**
 * `GET /api/v1/teams`: the names the news list's `team` filter takes, with
 * their three-letter codes. The list is fixed in code
 * (`packages/shared/src/tokens.ts`), so nothing is read; the request is still
 * keyed and counted like the others. Contract: `docs/news-api.md`.
 */
export default async function handler(event: RouteEvent) {
  return await serveKeyed(
    event.req,
    'newsApi.teams',
    (url) => parseNoParams(url.searchParams),
    (convex, apiKey) => convex.action(api.newsApiServe.teams, { apiKey }),
    () => ({ data: NEWS_API_TEAMS }),
  );
}
