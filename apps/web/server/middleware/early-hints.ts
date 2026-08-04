import { defineHandler } from 'nitro';

import appCss from '@/styles.css?url';

/**
 * The render-critical subresources, advertised as an HTTP `Link` header so
 * Cloudflare has something to build a `103 Early Hints` response from.
 *
 * Pages only derives `Link` headers from the HTML of *static* responses, and
 * ours is rendered by a Function, so the `<link rel="preload">` tags in the
 * root route's head are invisible to it. Without this header the Early Hints
 * setting in the dashboard is inert.
 *
 * What it buys: the document spends ~700ms being server-rendered, and today
 * nothing else moves during that window. The stylesheet is render-blocking and
 * is not requested until the HTML lands; the fonts are worse, sitting a further
 * hop back because they are only discovered once that stylesheet is parsed. A
 * 103 lets all four start during the wait instead of after it.
 *
 * `appCss` is the same `?url` import the root route links, so the hash here is
 * correct by construction rather than by a manifest lookup that could drift.
 * Vite resolves it to a literal at build time, which is what keeps this handler
 * free of any I/O: an SSR throw is fatal on the Workers runtime, so a response
 * hook is the last place that should be reading from disk or a manifest.
 *
 * The stylesheet gets no `crossorigin` (it is same-origin and the head's
 * `<link rel="stylesheet">` has none, and a mismatch fetches it twice), while
 * the fonts require it to match their `crossOrigin="anonymous"` for the same
 * reason.
 */
const LINK_HEADER = [
  `<${appCss}>; rel=preload; as=style`,
  ...[
    '/fonts/archivo-latin-var.woff2',
    '/fonts/ibm-plex-mono-400-latin.woff2',
    '/fonts/ibm-plex-mono-600-latin.woff2',
  ].map(
    (href) => `<${href}>; rel=preload; as=font; type=font/woff2; crossorigin`,
  ),
].join(', ');

export default defineHandler((event) => {
  // Document requests only. A navigating browser (and every crawler worth
  // hinting to) asks for text/html; the OG image routes, the Paddle and Clerk
  // webhooks, and the PostHog ingest proxy do not, and none of them will ever
  // render a font. Matching on Accept rather than a list of paths means new
  // routes are covered the day they ship instead of the day someone remembers
  // to add them here.
  if (!event.req.headers.get('accept')?.includes('text/html')) {
    return;
  }

  event.res.headers.set('link', LINK_HEADER);
});
