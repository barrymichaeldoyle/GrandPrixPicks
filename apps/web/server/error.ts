import type { NitroErrorHandler } from 'nitro/types';

/**
 * Last-resort error page for requests the app could not render at all.
 *
 * When SSR throws, Nitro's default reply is `{"status":500,"unhandled":true,
 * "message":"HTTPError"}` — served as JSON, so a browser shows a bare black
 * screen with a line of machine output on it. That is what visitors saw for
 * roughly twelve hours on 2026-08-03.
 *
 * Everything here is hand-written HTML with inline styles and no scripts, on
 * purpose. The React tree, the router, Clerk and Convex are all suspects at
 * this point — anything imported from the app is another way for the error
 * page itself to fail. The colours are copied from
 * `packages/shared/src/tokens.ts` rather than imported for the same reason;
 * they change roughly never, and a wrong shade beats a blank screen.
 */

// dark.page / surface / border / text / textMuted / accent
const COLOURS = {
  page: '#101113',
  surface: '#191a1d',
  border: '#2c2d31',
  text: '#f2f2f0',
  textMuted: '#a7a8ad',
  accent: '#d4ff3f',
} as const;

function errorPage(statusCode: number, requestId: string | undefined) {
  // Same voice as the in-app ErrorFallback: name the failure, say it wasn't
  // the visitor's fault, offer a way onwards. No error text — even mapped
  // messages read as diagnostics to someone who just wanted to make picks.
  const heading = statusCode === 503 ? 'Back shortly' : "It's broken";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${heading} | Grand Prix Picks</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
    padding:24px;background:${COLOURS.page};color:${COLOURS.text};
    font-family:Archivo,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased}
  main{width:100%;max-width:34rem}
  .eyebrow{margin:0;font-size:.75rem;font-weight:600;letter-spacing:.12em;
    text-transform:uppercase;color:${COLOURS.accent}}
  h1{margin:.75rem 0 0;font-size:2.25rem;font-weight:300;line-height:1.1}
  p{margin:1rem 0 0;color:${COLOURS.textMuted};line-height:1.6}
  .actions{margin-top:2rem;display:flex;flex-wrap:wrap;gap:.75rem}
  a{display:inline-flex;align-items:center;padding:.625rem 1.25rem;border-radius:2px;
    font-size:.875rem;font-weight:600;text-decoration:none}
  .primary{background:${COLOURS.accent};color:${COLOURS.page}}
  .secondary{border:1px solid ${COLOURS.border};background:${COLOURS.surface};color:${COLOURS.text}}
  .ref{margin-top:2rem;font-size:.75rem;color:${COLOURS.textMuted};font-family:ui-monospace,monospace}
  @media (min-width:640px){h1{font-size:3rem}}
</style>
</head>
<body>
<main>
  <p class="eyebrow">Red flag</p>
  <h1>${heading}</h1>
  <p>Something on our side stopped working. It isn't anything you did, and your saved picks are safe.</p>
  <div class="actions">
    <a class="primary" href="/">Try again</a>
    <a class="secondary" href="/support">Tell us about it</a>
  </div>
  ${requestId ? `<p class="ref">Reference: ${requestId}</p>` : ''}
</main>
</body>
</html>`;
}

// `HTTPEvent` only guarantees `req`; `url` lives on the concrete `H3Event`, so
// everything here goes through the request itself.
type ErrorHandlerArgs = Parameters<NitroErrorHandler>;

function handleError(error: ErrorHandlerArgs[0], event: ErrorHandlerArgs[1]) {
  const statusCode = error.statusCode || 500;

  // Non-browser callers keep the machine-readable body they expect: the API
  // routes under /api, the PostHog proxy at /ingest, and anything that did not
  // ask for HTML. Only a document request gets the page.
  const accept = event.req.headers.get('accept') ?? '';
  const wantsHtml = accept.includes('text/html');
  let path = '';
  try {
    path = new URL(event.req.url).pathname;
  } catch {
    // A malformed URL is not worth failing the error page over.
  }
  const isMachinePath = path.startsWith('/api/') || path.startsWith('/ingest');

  if (!wantsHtml || isMachinePath) {
    return new Response(
      JSON.stringify({ status: statusCode, message: error.message }),
      {
        status: statusCode,
        headers: { 'content-type': 'application/json;charset=UTF-8' },
      },
    );
  }

  // Cloudflare's ray id is the thread back to the request in the dashboard, so
  // a visitor quoting it in support gives us something to search on.
  const requestId = event.req.headers.get('cf-ray') ?? undefined;

  return new Response(errorPage(statusCode, requestId), {
    status: statusCode,
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      // An error is never the cached answer for a URL.
      'cache-control': 'no-store',
    },
  });
}

export default handleError satisfies NitroErrorHandler;
