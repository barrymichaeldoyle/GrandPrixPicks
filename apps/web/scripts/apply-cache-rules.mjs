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
 * STALE. Do not run this script without fixing this list first.
 *
 * The rules actually deployed on the zone are zone-wide: rule 1 matches
 * `not starts_with(http.request.uri.path, "/api/")` and rule 2 excludes
 * `/assets/`, `/fonts/` and `/flags/`. Verified 5 September 2026, when every
 * public path answered `cf-cache-status: EXPIRED` (an edge entry being
 * revalidated) and a request carrying a non-zero Clerk cookie answered
 * `DYNAMIC`.
 *
 * This file still carries the three-path allowlist from before that widening,
 * so running it as written would REPLACE the live rules with those three paths
 * and stop caching the rest of the site. That is a silent regression: nothing
 * fails, pages just start paying a full SSR render again, which is exactly the
 * four days of uncached pages recorded in the July 2026 perf pass.
 *
 * A route only needs `applySsrCacheControl` to be cached now; the edge rule no
 * longer has to name it. Before running this again, widen `paths` to match
 * what is deployed.
 */
const paths =
  '(http.request.uri.path eq "/" or http.request.uri.path eq "/f1-standings" or http.request.uri.path eq "/f1-qualifying-standings")';

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
