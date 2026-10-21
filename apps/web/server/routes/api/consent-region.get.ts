import { gdprApplies } from '../../lib/consentRegion';

type RouteEvent = {
  req: Request;
};

/**
 * Tells the browser whether this visitor is inside the GDPR regions, so the
 * analytics bridge (`src/lib/consent.ts`) can choose cookie or cookieless
 * capture without a consent manager and without waiting for one.
 *
 * `private, no-store` because the answer differs per visitor and the HTML
 * cache rule respects origin cache-control; a stored copy would hand every
 * visitor the first one's region.
 */
export default function handler(event: RouteEvent) {
  const gdpr = gdprApplies(event.req.headers.get('cf-ipcountry'));
  return new Response(JSON.stringify({ gdpr }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
    },
  });
}
