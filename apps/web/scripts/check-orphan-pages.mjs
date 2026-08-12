/**
 * Every sitemap URL must have a server-rendered inbound link.
 *
 * A `<Link>` that only renders inside a component gated on a client Convex
 * `useQuery` is absent from the SSR HTML. The page still works for a person,
 * but a crawler never finds it: it sits in the sitemap with a 200 and a
 * self-canonical and no route in. That is what happened to the eleven practice
 * pages, which spent weeks as "Crawled - currently not indexed".
 *
 * Nothing static can see this — the JSX looks identical either way — so this
 * checks the thing that actually matters: fetch every page the sitemap claims,
 * collect the anchors that survived to the HTML, and confirm each sitemap URL
 * is reachable from at least one other page.
 *
 * Needs a running server; it is not part of `pnpm lint`.
 *   node scripts/check-orphan-pages.mjs [--base-url http://127.0.0.1:3000]
 */
import process from 'node:process';

const args = process.argv.slice(2);
const baseUrlArg = args.indexOf('--base-url');
const BASE_URL = (
  baseUrlArg === -1 ? 'http://127.0.0.1:3000' : args[baseUrlArg + 1]
).replace(/\/$/, '');

/**
 * Paths that are deliberately unlinked. A page can be legitimately absent from
 * the site's own navigation and still belong in the sitemap — but it has to be
 * a decision someone made, written down here, not an accident.
 */
const ALLOWED_ORPHANS = new Set([
  '/', // The origin itself; every page links to it via the logo anyway.
]);

function normalize(pathname) {
  const clean = pathname.split('#')[0].split('?')[0];
  return clean.length > 1 ? clean.replace(/\/$/, '') : clean;
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return await response.text();
}

/** Anchors only, and only outside <script>: JSON-LD is full of URLs that are
 *  metadata, not navigation, and counting them would hide the very bug this
 *  script exists to find. */
function extractInternalLinks(html) {
  const withoutScripts = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ');
  const links = new Set();
  for (const match of withoutScripts.matchAll(
    /<a\b[^>]*\shref=["']([^"']+)["']/gi,
  )) {
    const href = match[1];
    if (href.startsWith('/') && !href.startsWith('//')) {
      links.add(normalize(href));
      continue;
    }
    try {
      const url = new URL(href);
      if (url.origin === BASE_URL || url.hostname === 'grandprixpicks.com') {
        links.add(normalize(url.pathname));
      }
    } catch {
      // Not a URL we can resolve (mailto:, tel:, a fragment) — not navigation.
    }
  }
  return links;
}

const sitemapXml = await fetchText(`${BASE_URL}/sitemap.xml`);
const sitemapPaths = [
  ...new Set(
    [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      normalize(new URL(m[1]).pathname),
    ),
  ),
];

if (sitemapPaths.length === 0) {
  console.error(`No <loc> entries found at ${BASE_URL}/sitemap.xml`);
  process.exit(1);
}

const linkedFrom = new Map();
let failed = 0;

for (const path of sitemapPaths) {
  let html;
  try {
    html = await fetchText(`${BASE_URL}${path}`);
  } catch (error) {
    console.error(`- ${path}: could not fetch (${error.message})`);
    failed++;
    continue;
  }
  for (const link of extractInternalLinks(html)) {
    // A page linking to itself is not an inbound link.
    if (link === path) {
      continue;
    }
    if (!linkedFrom.has(link)) {
      linkedFrom.set(link, new Set());
    }
    linkedFrom.get(link).add(path);
  }
}

const orphans = sitemapPaths.filter(
  (path) => !ALLOWED_ORPHANS.has(path) && !linkedFrom.has(path),
);

console.log(
  `Checked ${sitemapPaths.length} sitemap URLs against ${BASE_URL} — ` +
    `${orphans.length} with no server-rendered inbound link.`,
);

if (failed > 0) {
  console.error(`${failed} page(s) could not be fetched.`);
}

if (orphans.length > 0) {
  console.error(
    '\nThese are in the sitemap but nothing links to them in SSR HTML, so a\n' +
      'crawler has no route in. Give each one an inbound link from loader\n' +
      'data (not a client-only `useQuery`), or add it to ALLOWED_ORPHANS with\n' +
      'a reason:',
  );
  for (const path of orphans) {
    console.error(`- ${path}`);
  }
}

process.exit(orphans.length > 0 || failed > 0 ? 1 : 0);
