import { f1StoreUrlFor } from '../../lib/f1Store';

type RouteEvent = {
  req: Request;
};

/**
 * The F1 Store affiliate link every page uses, so the regional shop is chosen
 * at click time from where the visitor is (see `server/lib/f1Store.ts`).
 * `?page=` asks for one of the allowlisted store pages, such as a driver's.
 *
 * `private, no-store` because the answer differs per visitor: the Cloudflare
 * cache rule respects origin cache-control, and a stored copy would send
 * everyone to the first visitor's shop. `noindex` because it is a redirect to
 * a shop and nothing to rank.
 */
export default function handler(event: RouteEvent) {
  const headers = event.req.headers;
  return new Response(null, {
    status: 302,
    headers: {
      location: f1StoreUrlFor(
        headers.get('cf-ipcountry'),
        headers.get('accept-language'),
        new URL(event.req.url).searchParams.get('page'),
      ),
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
    },
  });
}
