/**
 * Measures how much of the site is a copy of the rest of it.
 *
 *   pnpm --filter @grandprixpicks/web check:duplication
 *   pnpm --filter @grandprixpicks/web check:duplication -- --base=http://127.0.0.1:3000
 *
 * This is the measurement `docs/seo-content-policy.md` describes, made
 * repeatable. AdSense has refused the site three times for "low value
 * content", the console says nothing about which URLs, and the only way to
 * know where the site stands is to measure prod. That measurement found the
 * real cause once already: 23 circuit pages whose body text was ~70%
 * reproduced on the corresponding race page. Run it before requesting another
 * review, and before adding any page.
 *
 * Deliberately not a CI gate. It fetches every sitemap URL over the network,
 * so in CI it would fail on someone else's outage; the same call `pnpm
 * check:baku-sources` makes, and for the same reason.
 *
 * Two things this gets right that a naive version does not, both learned the
 * hard way and both recorded in the policy doc:
 *
 * 1. **Chrome is subtracted, and measured rather than assumed.** Every page
 *    carries the same header and footer, which inflates every raw word count
 *    and every pairwise overlap. The shared run is computed as the common word
 *    prefix and suffix across all pages, because hardcoding a number goes
 *    stale the moment the footer changes.
 * 2. **Every page is compared with every other page, not just its siblings.**
 *    Sibling-only comparison is what missed the circuit pages entirely: within
 *    a template the overlap looked like a normal 17-35%, while each page was a
 *    near-subset of a page in a *different* template.
 */

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'] as const;
  }),
);
const BASE = args.get('base') ?? 'https://grandprixpicks.com';
/** Cross-template overlap at or above this is reported as a finding. */
const CROSS_TEMPLATE_LIMIT = Number(args.get('limit') ?? 50);
const CONCURRENCY = 6;
const SHINGLE = 5;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

type Page = {
  path: string;
  template: string;
  words: string[];
  shingles: Set<string>;
};

/**
 * Which template a URL belongs to.
 *
 * Rule 3 of the policy is "do not add a fifth template", so the groups are
 * named rather than derived from depth: a new shape showing up as
 * "standalone" when it is really a bulk-generated family is exactly the drift
 * this is meant to surface.
 */
function templateFor(path: string): string {
  if (/^\/f1-\d{4}-.+-grand-prix-predictions$/.test(path)) return 'writeup';
  if (/^\/races\/[^/]+\/practice$/.test(path)) return 'practice';
  if (/^\/races\/[^/]+$/.test(path)) return 'race';
  if (/^\/guides\/[^/]+$/.test(path)) return 'guide';
  return 'standalone';
}

function textOf(html: string): string[] {
  const stripped = html
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:rsquo|#8217|#39|apos);/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter(Boolean);
}

function shinglesOf(words: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + SHINGLE <= words.length; i += 1) {
    out.add(words.slice(i, i + SHINGLE).join(' '));
  }
  return out;
}

/** Share of `a`'s shingles that also appear in `b`, as a percentage. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0) return 0;
  let hit = 0;
  for (const s of a) if (b.has(s)) hit += 1;
  return (hit / a.size) * 100;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return await res.text();
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next;
        next += 1;
        if (i >= items.length) return;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

const sitemap = await fetchText(`${BASE}/sitemap.xml`);
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1]!.replace(BASE, '') || '/')
  .sort();

if (paths.length === 0) {
  console.error(`No <loc> entries at ${BASE}/sitemap.xml`);
  process.exit(1);
}
console.log(`${paths.length} sitemap URLs at ${BASE}\n`);

const fetched = await mapLimit(paths, CONCURRENCY, async (path) => {
  try {
    return { path, words: textOf(await fetchText(`${BASE}${path}`)) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error(`  FAILED ${path}: ${reason}`);
    return { path, words: [] as string[] };
  }
});
const usable = fetched.filter((p) => p.words.length > 0);
if (usable.length !== paths.length) {
  console.error(
    `\nOnly ${usable.length} of ${paths.length} URLs fetched. Every number below` +
      ' is computed from a partial site, so this run does not stand. Retry it.',
  );
  process.exit(1);
}

/**
 * The shared chrome, measured rather than assumed.
 *
 * Whatever most pages say in the same order at the top and the bottom is the
 * header and footer. Counting it flatters every page's length and every
 * pairwise overlap, and the policy doc is explicit that the number must not be
 * hardcoded, because it moves whenever the footer changes.
 *
 * Majority rather than unanimity, and located rather than sliced. A strict
 * common suffix across every page is not stable: `/f1-predictions-this-weekend`
 * renders a signed-out "Sign in" control after its footer, and whether that
 * reaches the crawler depends on which variant the edge cache serves. Two runs
 * minutes apart measured 0 words of footer and then 118. One page with trailing
 * markup must not leave 118 words of footer inside every count on the site, so
 * the run is the longest one at least `AGREEMENT` of pages share, and each page
 * has it cut from wherever it actually sits.
 */
const AGREEMENT = 0.75;

function sharedRun(all: string[][], side: 'head' | 'tail'): string[] {
  const at = (w: string[], n: number) =>
    side === 'head' ? w[n] : w[w.length - 1 - n];
  let run: string[] = [];
  for (let n = 0; ; n += 1) {
    const counts = new Map<string, number>();
    for (const w of all) {
      const word = at(w, n);
      if (word === undefined) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    const best = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] < all.length * AGREEMENT) return run;
    run = side === 'head' ? [...run, best[0]] : [best[0], ...run];
  }
}

/** Cut `run` off the given end of `words`, if this page carries it there. */
function stripRun(
  words: string[],
  run: string[],
  side: 'head' | 'tail',
): string[] {
  if (run.length === 0) return words;
  const joined = run.join(' ');
  if (side === 'head') {
    return words.slice(0, run.length).join(' ') === joined
      ? words.slice(run.length)
      : words;
  }
  // Searched from the end, so a widget rendered after the footer does not
  // stop the footer being found.
  for (let end = words.length; end >= run.length; end -= 1) {
    if (words.slice(end - run.length, end).join(' ') === joined) {
      return words.slice(0, end - run.length);
    }
  }
  return words;
}

const allWords = usable.map((p) => p.words);
const headRun = sharedRun(allWords, 'head');
const tailRun = sharedRun(allWords, 'tail');
console.log(
  `Shared chrome: ${headRun.length} words of header, ${tailRun.length} of footer\n`,
);

const pages: Page[] = usable.map(({ path, words }) => {
  const body = stripRun(stripRun(words, headRun, 'head'), tailRun, 'tail');
  return {
    path,
    template: templateFor(path),
    words: body,
    shingles: shinglesOf(body),
  };
});

// 1. Content words per page, ascending. Length has never been this site's
//    problem, so this exists to prove that again rather than to find anything.
console.log('Content words per page (chrome removed)');
for (const p of [...pages].sort((a, b) => a.words.length - b.words.length)) {
  console.log(
    `  ${String(p.words.length).padStart(5)}  ${p.template.padEnd(10)} ${p.path}`,
  );
}

// 2. Template ratio. 72% templated at the last rejection, up from 65%: the
//    site grew in the direction it was refused for, and this is the number
//    that says whether that is still happening.
const byTemplate = new Map<string, Page[]>();
for (const p of pages) {
  byTemplate.set(p.template, [...(byTemplate.get(p.template) ?? []), p]);
}
const templated = pages.filter((p) => p.template !== 'standalone').length;
console.log(
  `\nTemplate mix: ${templated}/${pages.length} templated (${Math.round((templated / pages.length) * 100)}%)`,
);
for (const [name, group] of [...byTemplate].sort(
  (a, b) => b[1].length - a[1].length,
)) {
  console.log(`  ${String(group.length).padStart(3)}  ${name}`);
}

// 3. Sibling overlap within each template. Normal is 17-35%; repeated driver
//    names in results tables push it up without meaning anything, so this is
//    context for the next section rather than a verdict on its own.
console.log('\nWorst sibling overlap within each template');
for (const [name, group] of byTemplate) {
  if (group.length < 2) continue;
  let worst = { a: '', b: '', pct: 0 };
  for (const a of group) {
    for (const b of group) {
      if (a === b) continue;
      const pct = overlap(a.shingles, b.shingles);
      if (pct > worst.pct) worst = { a: a.path, b: b.path, pct };
    }
  }
  console.log(
    `  ${name.padEnd(10)} ${worst.pct.toFixed(0).padStart(3)}%  ${worst.a} -> ${worst.b}`,
  );
}

// 4. The one that matters. For every page, the single page it overlaps most
//    with anywhere on the site. This is the comparison that found the circuit
//    pages when the sibling view said everything was fine.
console.log("\nEach page's closest match anywhere on the site");
const findings: string[] = [];
const rows = pages.map((a) => {
  let best = { path: '', template: '', pct: 0 };
  for (const b of pages) {
    if (a === b) continue;
    const pct = overlap(a.shingles, b.shingles);
    if (pct > best.pct) best = { path: b.path, template: b.template, pct };
  }
  return { a, best };
});
for (const { a, best } of rows.sort((x, y) => y.best.pct - x.best.pct)) {
  const cross = best.template !== a.template;
  const flag = cross && best.pct >= CROSS_TEMPLATE_LIMIT ? ' <-- CROSS' : '';
  console.log(
    `  ${best.pct.toFixed(0).padStart(3)}%  ${a.path} -> ${best.path}${flag}`,
  );
  if (cross && best.pct >= CROSS_TEMPLATE_LIMIT) {
    findings.push(
      `${a.path} (${a.template}) is ${best.pct.toFixed(0)}% reproduced on ${best.path} (${best.template})`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    `\n${findings.length} page(s) at or above ${CROSS_TEMPLATE_LIMIT}% overlap with a page in another template:\n  ${findings.join('\n  ')}\n\n` +
      'Rule 2 of docs/seo-content-policy.md: the weaker page canonicalises to\n' +
      'the stronger and leaves the sitemap, or it is merged and redirected.',
  );
  process.exit(1);
}
console.log(
  `\nNo cross-template overlap at or above ${CROSS_TEMPLATE_LIMIT}%.`,
);
