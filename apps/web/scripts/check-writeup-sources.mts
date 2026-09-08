/**
 * Checks the citations on the race write-ups hold together.
 *
 *   pnpm --filter @grandprixpicks/web lint:writeup-sources
 *   pnpm --filter @grandprixpicks/web check:writeup-links   (adds a network pass)
 *
 * Be clear about what this can and cannot do. It cannot tell you whether a
 * source supports the sentence next to it: on 2026-09-08 four fabrications
 * were found across these pages, including a claim attributed to The Race that
 * neither cited article makes and a Sepang resurfacing date contradicted by
 * the circuit's own designer, and every one of them would pass this script.
 * Verifying a claim means reading the cited article, and that stays human.
 *
 * What it does is remove the mechanical failures that make an unsupported
 * claim easy to write and hard to spot:
 *
 * 1. **A source constant nothing references**, which is a citation deleted
 *    from the prose whose declaration stayed behind, still looking like
 *    attribution to the next editor.
 * 2. **A footer credit that names the wrong publisher.** Baku's footer
 *    credited a formula1.com race report to "Pirelli". In the footer the link
 *    text is a masthead, so it is checkable; in the prose it describes the
 *    article instead, and a publisher's name there is an ordinary word.
 * 3. **A citation with no matching constant.**
 *
 * A rule for "cited only from the footer" was written and then removed. It
 * fired eight times on correct pages, because a source backing the stat strip
 * or a signal row has nowhere else to go: those are plain strings and cannot
 * carry a link. A rule that is wrong on correct code gets ignored, and these
 * three hold at an empty baseline.
 *
 * The link-liveness pass is opt-in and separate, for the same reason
 * check-baku-sources.mts is hand-run: it talks to a dozen third-party sites.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROUTES = 'src/routes';
const WRITEUP = /^f1-\d{4}-.+-grand-prix-predictions\.tsx$/;
const CHECK_LINKS = process.argv.includes('--links');
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

/**
 * Publisher names we expect to see as link text, and the domains that carry
 * them. Only the ones actually used on these pages: an unlisted domain is not
 * a finding, because the check is "this label contradicts this URL", not "this
 * label is unknown".
 */
const PUBLISHERS: Record<string, RegExp> = {
  'formula 1': /(^|\.)formula1\.com$/,
  f1: /(^|\.)formula1\.com$/,
  pirelli: /(^|\.)pirelli\.com$/,
  autosport: /(^|\.)autosport\.com$/,
  'the race': /(^|\.)the-race\.com$/,
  planetf1: /(^|\.)planetf1\.com$/,
  'sky sports': /(^|\.)skysports\.com$/,
  'motor sport': /(^|\.)motorsportmagazine\.com$/,
  'motorsport week': /(^|\.)motorsportweek\.com$/,
  bernama: /(^|\.)bernama\.com$/,
  gpblog: /(^|\.)gpblog\.com$/,
  dromo: /(^|\.)studiodromo\.it$/,
  madring: /(^|\.)madring\.com$/,
  'grandprix.com': /(^|\.)grandprix\.com$/,
  'pit debrief': /(^|\.)pitdebrief\.com$/,
  'fia formula 3': /(^|\.)fiaformula3\.com$/,
  'racingcircuits.info': /(^|\.)racingcircuits\.info$/,
  'news.gp': /(^|\.)news\.gp$/,
};

type Finding = { file: string; message: string };
const findings: Finding[] = [];
const urls = new Map<string, string[]>();

const files = readdirSync(ROUTES)
  .filter((f) => WRITEUP.test(f))
  .sort();

if (files.length === 0) {
  console.error(`No write-up routes found in ${ROUTES}`);
  process.exit(1);
}

for (const file of files) {
  const src = readFileSync(join(ROUTES, file), 'utf8');

  // Declared sources: `const NAME_SOURCE = '...'`, possibly wrapped.
  const declared = new Map<string, string>();
  for (const m of src.matchAll(/const (\w*SOURCE)\s*=\s*\n?\s*'([^']+)'/g)) {
    declared.set(m[1]!, m[2]!);
  }

  // The footer's own span. Source order is not render order (the page
  // component is declared above the sections it renders), so this is the
  // element's start tag to its closing tag, not "everything after".
  const footerStart = src.indexOf('<footer');
  const footerEnd =
    footerStart >= 0 ? src.indexOf('</footer>', footerStart) : -1;
  const cited = new Map<string, { label: string; inFooter: boolean }[]>();
  for (const m of src.matchAll(
    /<ExternalSource\s+href=\{(\w+)\}\s*>([\s\S]*?)<\/ExternalSource>/g,
  )) {
    const name = m[1]!;
    const label = m[2]!
      .replace(/\{'\s*'\}/g, ' ')
      .replace(/&rsquo;/g, "'")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const inFooter =
      footerStart >= 0 && m.index! > footerStart && m.index! < footerEnd;
    cited.set(name, [...(cited.get(name) ?? []), { label, inFooter }]);
  }

  for (const [name, url] of declared) {
    const uses = cited.get(name) ?? [];
    // Any reference at all, not only an <ExternalSource>: a source can also be
    // handed to a component as a prop, the way the standings table takes one.
    const references = [...src.matchAll(new RegExp(`\\b${name}\\b`, 'g'))]
      .length;
    if (references <= 1) {
      findings.push({
        file,
        message: `${name} is declared and never used. Cite it or delete it.`,
      });
      continue;
    }
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      findings.push({ file, message: `${name} is not a valid URL: ${url}` });
      continue;
    }
    // Footer citations only. There the convention is "Subject: Publisher", so
    // the link text is a masthead and can be checked against the domain. In
    // the prose it is a description of the article, where a publisher's name
    // is an ordinary word: "Read the race report" is a PlanetF1 link and "Read
    // how Pirelli prepared" is an Autosport one, and both are correct.
    for (const { label, inFooter } of uses) {
      if (!inFooter) continue;
      const lower = label.toLowerCase();
      for (const [publisher, domain] of Object.entries(PUBLISHERS)) {
        // Whole-word match, so "F1" does not fire inside "PlanetF1".
        const named = new RegExp(
          `(^|[^a-z0-9.])${publisher.replace(/[.]/g, '\\.')}([^a-z0-9.]|$)`,
        ).test(lower);
        if (named && !domain.test(host)) {
          findings.push({
            file,
            message: `"${label}" links to ${host}, which is not ${publisher}. (${name})`,
          });
        }
      }
    }
    urls.set(url, [...(urls.get(url) ?? []), `${file}:${name}`]);
  }

  const orphanCitations = [...cited.keys()].filter((n) => !declared.has(n));
  for (const name of orphanCitations) {
    findings.push({
      file,
      message: `<ExternalSource href={${name}}> has no matching source constant.`,
    });
  }
}

console.log(`${files.length} write-ups, ${urls.size} distinct sources\n`);

if (CHECK_LINKS) {
  const failed: string[] = [];
  for (const url of [...urls.keys()].sort()) {
    let status: number | string;
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(25_000),
        redirect: 'follow',
      });
      status = res.status;
    } catch (error) {
      status = error instanceof Error ? error.name : 'unknown';
    }
    const ok = status === 200;
    console.log(`  ${ok ? 'ok  ' : 'DEAD'} ${status}  ${url}`);
    if (!ok) failed.push(`${url}\n    ${urls.get(url)?.join(', ')}`);
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length} unreachable:\n  ${failed.join('\n  ')}`);
  }
  console.log('');
}

if (findings.length > 0) {
  console.error(`${findings.length} finding(s):`);
  for (const f of findings) console.error(`  ${f.file}\n    ${f.message}`);
  console.error(
    '\nNone of this checks whether a source supports the claim beside it.' +
      '\nThat means reading the article: see docs/race-writeup-lifecycle.md.',
  );
  process.exit(1);
}
console.log('Every source is declared, cited in place and labelled correctly.');
