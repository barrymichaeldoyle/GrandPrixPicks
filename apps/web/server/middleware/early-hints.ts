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

/** Machine-facing prefixes: JSON, images and analytics, never a rendered page. */
const NON_DOCUMENT_PREFIXES = ['/api/', '/og/', '/ingest/'];

export default defineHandler((event) => {
  const { pathname } = new URL(event.req.url);

  // Deliberately keyed on the path alone, NOT on the request's Accept header.
  // These documents are edge-cached (`s-maxage=60`) and Cloudflare's cache key
  // does not include Accept, so whichever request fills the cache decides what
  // every later visitor gets. Gating on Accept meant one monitor or crawler
  // sending `*/*` would store a header-less response and silently strip the
  // hints from every browser behind it until the entry expired.
  if (NON_DOCUMENT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return;
  }

  // Anything with a file extension is an asset or a machine format
  // (/sitemap.xml, /robots.txt, /sw.js). Excluding by shape rather than by
  // name keeps new page routes covered the day they ship, which is the part
  // worth preserving from the Accept-based version.
  if (pathname.slice(pathname.lastIndexOf('/')).includes('.')) {
    return;
  }

  event.res.headers.set('link', LINK_HEADER);
});
