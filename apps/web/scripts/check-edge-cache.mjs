#!/usr/bin/env node
/**
 * Asserts that Cloudflare is actually edge-caching the SSR documents that
 * `applySsrCacheControl` marks as cacheable, and is never serving a cached
 * signed-out document to a signed-in visitor.
 *
 * This exists because the failure mode is silent. The original cache rule sat
 * in prod for two weeks with `edge_ttl: bypass_by_default`, so the
 * `s-maxage` header was inert and the only symptom was an absence of cache
 * hits — nothing errored, nothing looked broken.
 *
 * Runs after `pnpm deploy`. Override the target with EDGE_CACHE_CHECK_URL.
 */
import process from 'node:process';

const BASE = process.env.EDGE_CACHE_CHECK_URL ?? 'https://grandprixpicks.com';

/**
 * Clerk's durable "is there a session" cookie for the prod instance, suffixed
 * with the hash of the publishable key. Not a secret: it is readable by any
 * script on the page. If the Clerk instance is ever replaced, this check fails
 * loudly (the bypass rule stops matching), which is the correct direction —
 * re-derive it with the snippet in `apply-cache-rules.mjs` and update here.
 */
const SIGNED_IN_COOKIE =
  process.env.EDGE_CACHE_CHECK_COOKIE ?? '__client_uat_ghhmdBz_';

/** The only routes that call `applySsrCacheControl`. */
const PATHS = ['/', '/f1-standings'];

const ATTEMPTS = 6;
const RETRY_MS = 1500;
/** Cache is working but this particular response was not a hit yet. */
const WARMING = new Set(['MISS', 'EXPIRED', 'REVALIDATED', 'UPDATING']);

const failures = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probe(path, cookie) {
  const response = await fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  // Nothing here reads the body; leaving it open keeps the socket alive.
  await response.body?.cancel();
  return {
    status: response.status,
    cacheStatus: (
      response.headers.get('cf-cache-status') ?? 'NONE'
    ).toUpperCase(),
    cacheControl: response.headers.get('cache-control') ?? '',
  };
}

function record(name, ok, detail) {
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`,
  );
  if (!ok) {
    failures.push(`${name}: ${detail}`);
  }
}

/**
 * A response that should end up served from the edge. Retries, because a cold
 * or just-expired cache legitimately answers MISS/EXPIRED first.
 */
async function expectCacheable(name, path, cookie) {
  let last;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    last = await probe(path, cookie);

    if (!/\bpublic\b/.test(last.cacheControl)) {
      record(
        name,
        false,
        `origin sent "${last.cacheControl}", expected public`,
      );
      return;
    }
    if (last.cacheStatus === 'HIT') {
      record(name, true, 'HIT');
      return;
    }
    if (!WARMING.has(last.cacheStatus)) {
      // DYNAMIC/BYPASS here means no cache rule is making this eligible.
      record(
        name,
        false,
        `cf-cache-status ${last.cacheStatus}, never cacheable`,
      );
      return;
    }
    await sleep(RETRY_MS);
  }

  record(
    name,
    false,
    `never reached HIT in ${ATTEMPTS} attempts (last ${last.cacheStatus})`,
  );
}

/** A response that must never come from a shared cache. */
async function expectPrivate(name, path, cookie) {
  const result = await probe(path, cookie);

  if (result.cacheStatus === 'HIT') {
    record(
      name,
      false,
      'served from the edge cache — signed-in visitors would get signed-out HTML',
    );
    return;
  }
  if (!/no-store/.test(result.cacheControl)) {
    record(
      name,
      false,
      `origin sent "${result.cacheControl}", expected private, no-store`,
    );
    return;
  }
  record(name, true, `${result.cacheStatus}, ${result.cacheControl}`);
}

console.log(`Edge cache check against ${BASE}`);

for (const path of PATHS) {
  console.log(`\n${path}`);
  await expectCacheable(`${path} anonymous is edge-cached`, path, null);
  // The regression that was live for two weeks: Clerk leaves `=0` behind on
  // every browser that has signed out, and a presence-based rule excluded all
  // of them from the cache.
  await expectCacheable(
    `${path} signed-out leftover cookie is edge-cached`,
    path,
    `${SIGNED_IN_COOKIE}=0`,
  );
  await expectPrivate(
    `${path} signed-in bypasses the cache`,
    path,
    `${SIGNED_IN_COOKIE}=1754300000`,
  );
}

if (failures.length > 0) {
  console.error(`\n${failures.length} edge cache check(s) failed:`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error(
    '\nThe deploy itself succeeded; this is the Cloudflare cache rule config.' +
      '\nInspect with: node scripts/apply-cache-rules.mjs (dry run).',
  );
  process.exit(1);
}

console.log('\nAll edge cache checks passed.');
