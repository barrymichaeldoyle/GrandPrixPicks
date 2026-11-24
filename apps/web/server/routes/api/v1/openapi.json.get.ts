import { newsApiSpec } from '../../../lib/newsApiSpec';

/**
 * The news API's OpenAPI document. Public and cacheable: it describes the
 * API and holds no news.
 */
export default function handler() {
  return new Response(JSON.stringify(newsApiSpec(), null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      'access-control-allow-origin': '*',
    },
  });
}
