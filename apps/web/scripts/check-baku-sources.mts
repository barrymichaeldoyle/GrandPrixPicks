/**
 * Checks every citation in the Baku crash archive still resolves.
 *
 *   pnpm --filter @grandprixpicks/web check:baku-sources
 *
 * Deliberately not a unit test and not a CI gate. It talks to a dozen third
 * party sites, so in CI it would be a flake generator that fails on someone
 * else's outage; run it by hand when touching the archive, and before a
 * weekend when the section gets traffic.
 *
 * It exists because a citation that 500s is worse than no citation on a
 * feature whose whole claim is that it can be checked. One domain had already
 * gone dark by the time anyone looked.
 */
import { BAKU_CRASHES } from '../src/lib/bakuCrashes';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const TIMEOUT_MS = 25_000;

async function check(url: string): Promise<number | string> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.status;
  } catch (error) {
    return error instanceof Error ? error.name : 'unknown';
  }
}

const byUrl = new Map<string, string[]>();
for (const crash of BAKU_CRASHES) {
  byUrl.set(crash.source, [...(byUrl.get(crash.source) ?? []), crash.id]);
}

const linked = [...byUrl.keys()].filter((url) => url.startsWith('https://'));
const offline = [...byUrl.keys()].filter((url) => !url.startsWith('https://'));

console.log(
  `${BAKU_CRASHES.length} incidents, ${linked.length} linked sources, ${offline.length} cited to a log`,
);

const failures: string[] = [];
for (const url of linked.sort()) {
  const status = await check(url);
  const ok = status === 200;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${status}  ${url}`);
  if (!ok) {
    failures.push(`${url}\n    used by: ${byUrl.get(url)?.join(', ')}`);
  }
}

if (failures.length > 0) {
  console.error(
    `\n${failures.length} unreachable:\n  ${failures.join('\n  ')}`,
  );
  process.exit(1);
}
console.log('\nEvery citation resolves.');
