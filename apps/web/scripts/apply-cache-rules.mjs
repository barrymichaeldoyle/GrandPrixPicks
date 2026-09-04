#!/usr/bin/env node
/**
 * Deploys the two Cloudflare Cache Rules that make SSR HTML edge-cacheable
 * without serving a signed-out document to a signed-in visitor.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... \
 *   CLERK_PUBLISHABLE_KEY=pk_live_... node apply-cache-rules.mjs [--apply]
 */
import { createHash } from 'node:crypto';

const API = 'https://api.cloudflare.com/client/v4';
const PHASE = 'http_request_cache_settings';
/** Marks the rules this script owns, so re-runs replace rather than duplicate. */
const OWNED = 'gpp:';

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const apply = process.argv.includes('--apply');

const missing = [
  !token && 'CLOUDFLARE_API_TOKEN',
  !zoneId && 'CLOUDFLARE_ZONE_ID',
  !publishableKey && 'CLERK_PUBLISHABLE_KEY',
].filter(Boolean);
if (missing.length > 0) {
  console.error(`Missing env: ${missing.join(', ')}`);
  process.exit(1);
}

/**
 * Mirrors computeClerkCookieSuffix() in apps/web/server/lib/auth.ts. The rule
 * has to test the same cookie the SSR auth read tests, or the two disagree
 * about who is signed in.
 */
function clerkCookieName(key) {
  const suffix = createHash('sha1')
    .update(key)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 8);
  return `__client_uat_${suffix}`;
}

const cookie = clerkCookieName(publishableKey);

/**
 * Mirrors isClerkSessionPresent()'s precedence: this instance's suffixed
 * cookie decides, and the pre-suffix unsuffixed cookie only counts when the
 * suffixed one is absent. Testing `=0` rather than presence matters because
 * Clerk leaves a `0` behind on every browser that has ever signed out.
 */
const signedIn =
  `((http.cookie contains "${cookie}=" and not http.cookie contains "${cookie}=0") ` +
  `or (not http.cookie contains "${cookie}=" ` +
  `and http.cookie contains "__client_uat=" ` +
  `and not http.cookie contains "__client_uat=0"))`;

/**
 * The routes that call applySsrCacheControl() and are worth an edge entry.
 *
 * A route asking for a cache-control header does nothing on its own: without
 * a path here, Pages answers `cf-cache-status: DYNAMIC` and pays a full SSR
 * render per request. The two 2027 pages were exactly that — hand-maintained
 * static content, changing only on deploy, re-rendered for every crawler.
 *
 * Adding a path means re-running this script; the rule set is replaced whole.
 */
const CACHEABLE_PATHS = [
  '/',
  '/f1-standings',
  '/f1-qualifying-standings',
  '/f1-2027-calendar',
  '/f1-2027-driver-line-up',
];

const paths = `(${CACHEABLE_PATHS.map(
  (path) => `http.request.uri.path eq "${path}"`,
).join(' or ')})`;

const rules = [
  {
    description: `${OWNED} SSR HTML eligible for cache (respect origin cache-control)`,
    expression: paths,
    action: 'set_cache_settings',
    action_parameters: {
      cache: true,
      edge_ttl: { mode: 'respect_origin' },
      browser_ttl: { mode: 'respect_origin' },
    },
    enabled: true,
  },
  {
    // MUST stay after the rule above: cache rules are stackable and the last
    // matching rule wins for conflicting settings.
    description: `${OWNED} bypass cache for signed-in Clerk sessions`,
    expression: `${paths} and ${signedIn}`,
    action: 'set_cache_settings',
    action_parameters: { cache: false },
    enabled: true,
  },
];

async function cf(path, init) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = await response.json();
  if (!body.success) {
    console.error(JSON.stringify(body.errors ?? body, null, 2));
    throw new Error(
      `${init?.method ?? 'GET'} ${path} failed (${response.status})`,
    );
  }
  return { status: response.status, body };
}

console.log(`Cookie the rule will test: ${cookie}`);

const entrypoint = `/zones/${zoneId}/rulesets/phases/${PHASE}/entrypoint`;
const current = await cf(entrypoint);
const existing = current.body.result?.rules ?? [];

console.log(`\nExisting cache rules (${existing.length}):`);
for (const rule of existing) {
  console.log(`  - ${rule.description || '(no description)'}`);
}

const preserved = existing.filter(
  (rule) => !(rule.description ?? '').startsWith(OWNED),
);
const merged = [...preserved, ...rules].map(
  ({ description, expression, action, action_parameters, enabled }) => ({
    description,
    expression,
    action,
    action_parameters,
    enabled,
  }),
);

console.log(`\nResulting rules, in evaluation order (${merged.length}):`);
for (const [index, rule] of merged.entries()) {
  console.log(`  ${index + 1}. ${rule.description}`);
  console.log(`     ${rule.expression}`);
}

if (!apply) {
  console.log('\nDry run. Re-run with --apply to deploy.');
  process.exit(0);
}

await cf(entrypoint, {
  method: 'PUT',
  body: JSON.stringify({ rules: merged }),
});
console.log('\nDeployed.');
