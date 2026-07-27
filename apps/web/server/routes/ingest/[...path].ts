/**
 * First-party reverse proxy for PostHog ingestion.
 *
 * Requests to `eu.i.posthog.com` are blocked by most ad blockers and by some
 * corporate DNS, so a share of real traffic never reports at all. Routing
 * ingestion through our own origin fixes that, and is what PostHog's own setup
 * health check asks for.
 *
 * Cost note: every captured event now costs a worker invocation on the site's
 * own deployment rather than going straight to PostHog. Setting
 * `VITE_POSTHOG_HOST` to `https://eu.i.posthog.com` points the client back at
 * PostHog directly and leaves this route unused.
 */

const API_HOST = 'https://eu.i.posthog.com';
const ASSET_HOST = 'https://eu-assets.i.posthog.com';

/** Hop-by-hop and origin-specific headers that must not be forwarded upstream. */
const STRIPPED_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'proxy-authorization',
  'proxy-connection',
  // Our own cookies are irrelevant to PostHog and should not leak upstream.
  'cookie',
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
]);

type RouteEvent = {
  req: Request;
};

function buildUpstreamUrl(requestUrl: URL): URL {
  // Everything after /ingest, e.g. "/e/" or "/static/array.js".
  const path = requestUrl.pathname.replace(/^\/ingest/, '') || '/';
  // The snippet and recorder bundles live on the asset host; events do not.
  const base = path.startsWith('/static/') ? ASSET_HOST : API_HOST;
  const upstream = new URL(path, base);
  upstream.search = requestUrl.search;
  return upstream;
}

function forwardedHeaders(request: Request, upstream: URL): Headers {
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    if (!STRIPPED_REQUEST_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  }
  headers.set('host', upstream.host);
  return headers;
}

export default async function handler(event: RouteEvent) {
  const requestUrl = new URL(event.req.url);
  const upstream = buildUpstreamUrl(requestUrl);

  const hasBody = event.req.method !== 'GET' && event.req.method !== 'HEAD';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, {
      method: event.req.method,
      headers: forwardedHeaders(event.req, upstream),
      body: hasBody ? await event.req.arrayBuffer() : undefined,
      redirect: 'follow',
    });
  } catch {
    // Losing analytics must never surface to the visitor as a failed request.
    return new Response(null, { status: 204 });
  }

  const headers = new Headers();
  for (const [name, value] of upstreamResponse.headers) {
    if (!STRIPPED_RESPONSE_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
