import { api } from '@convex-generated/api';

import { getServerConvexClient } from '../../../../lib/convex';
import { newsApiError } from '../../../../lib/newsApi';
import { captureServerException } from '../../../../lib/sentry';

/**
 * `GET /api/v1/news/sample`: a fixed page of three real stories in the live
 * shape, for trying the API without a key. Public and cacheable, like the
 * OpenAPI document: it is the same for everyone and holds no news a key would
 * need. The page is `NEWS_API_SAMPLE` in the backend, served through the
 * list's own validator so it cannot drift from what a key gets.
 */
export default async function handler() {
  try {
    const page = await getServerConvexClient().query(api.newsApi.sample, {});
    return new Response(JSON.stringify(page), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=3600, s-maxage=3600',
        'access-control-allow-origin': '*',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'newsApi.sample' });
    return newsApiError('unavailable');
  }
}
