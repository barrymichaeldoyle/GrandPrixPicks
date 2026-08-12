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

/** 3xx codes that actually redirect. 304 is a cache hit, not a redirect. */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** The PostHog origin serving a proxied path, or null if we will not proxy it. */
function upstreamOriginFor(path: string): string | null {
  // `new URL(path, base)` treats a leading "//" as protocol-relative, so
  // "/ingest//evil.example/x" would resolve off the PostHog base entirely and
  // turn this route into an open proxy.
  if (!path.startsWith('/') || path.startsWith('//')) {
    return null;
  }
  // The snippet and recorder bundles live on the asset host; events do not.
  return path.startsWith('/static/') ? ASSET_HOST : API_HOST;
}

/**
 * Resolve the upstream URL, or null if the path is not one we will proxy.
 *
 * The origin check is the real guarantee: whatever the path parser does, the
 * request only leaves here if it still points at PostHog.
 */
function buildUpstreamUrl(requestUrl: URL): URL | null {
  // Everything after /ingest, e.g. "/e/" or "/static/array.js".
  const path = requestUrl.pathname.replace(/^\/ingest/, '') || '/';
  const base = upstreamOriginFor(path);
  if (!base) {
    return null;
  }
  const upstream = new URL(path, base);
  if (upstream.origin !== base) {
    return null;
  }
  upstream.search = requestUrl.search;
  return upstream;
}

/**
 * Point an upstream redirect back through this route, or null if it leaves
 * PostHog. Following redirects inside `fetch` would let a redirect reach any
 * host; handing the raw `Location` to the browser would send it straight to
 * PostHog, which is what the ad blockers eat. Rewriting keeps both properties.
 */
function proxiedRedirect(location: string, upstream: URL): string | null {
  let target: URL;
  try {
    target = new URL(location, upstream);
  } catch {
    return null;
  }
  // Also rejects a target whose path would route back to the other PostHog host.
  if (upstreamOriginFor(target.pathname) !== target.origin) {
    return null;
  }
  return `/ingest${target.pathname}${target.search}`;
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
  if (!upstream) {
    return new Response(null, { status: 404 });
  }

  const hasBody = event.req.method !== 'GET' && event.req.method !== 'HEAD';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, {
      method: event.req.method,
      headers: forwardedHeaders(event.req, upstream),
      body: hasBody ? await event.req.arrayBuffer() : undefined,
      redirect: 'manual',
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

  if (REDIRECT_STATUSES.has(upstreamResponse.status)) {
    const location = upstreamResponse.headers.get('location');
    const proxied = location ? proxiedRedirect(location, upstream) : null;
    if (!proxied) {
      // A redirect off PostHog is not something we hand to the visitor.
      return new Response(null, { status: 204 });
    }
    headers.set('location', proxied);
    return new Response(null, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
