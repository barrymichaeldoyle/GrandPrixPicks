# SEO content policy

Read this before adding a page, a page template, or a sitemap entry.

Google AdSense has turned `grandprixpicks.com` down three times for **"low
value content"** — 2026-08-02, 2026-08-13 and 2026-09-06. The console gives no
dates, no per-URL detail and no reviewer notes beyond four boilerplate policy
links, so the only way to know where the site stands is to measure prod
yourself. The rules below are what those measurements said, and they are
binding on SEO work until a review passes.

## What the measurements found

Taken 2026-09-06 against all 82 sitemap URLs (fetch each, strip
`<script>`/`<style>`/`<head>`, strip tags, then drop the 135 words of shared
chrome — 20 header + 115 footer — because raw word counts flatter every page by
that much).

**The site grew in the direction it was rejected for.** 51 URLs in August, 82 in
September, and 59 of those 82 (72%) were one of four templates, up from 65% at
the previous rejection. Each round of "fix the thin content" had added pages.

**Length was not the problem.** Nothing was under 189 content words. The four
`/guides` explainers ran 750-1160.

**Sibling duplication was not the problem either.** Within a template, pages
shared 17-35% of their body text with each other — normal, and not the
scaled-content-abuse signal it can look like. Repeated driver-name sequences in
results tables make naive shingle comparisons look far worse than reality;
always subtract the chrome before comparing.

**Cross-template duplication was the problem.** About **70% of every circuit
page's body text was reproduced verbatim on the corresponding race page**
(73% Albert Park / Australia, 72% Lusail / Qatar, 71% Red Bull Ring / Austria,
19 of 23 in the 67-74% band). The circuit page was a strict _subset_ of a page
that also carried the schedule, the classification and the picks — 23 URLs, 28%
of the sitemap, asking to be indexed for content already published somewhere
stronger.

**Those 23 pages and their index were deleted on 2026-09-07** and now 301 to
`/races`. Canonicalising them had already taken them out of the sitemap, so the
remaining search win was one URL; the reason to finish the job was that the site
was still linking readers into a duplicate of itself, from the footer, the
dashboard rail, the calendar and every race page, and that they were 23 pages of
unfact-checked prose standing behind an editorial review. The briefing itself
survives: `circuitGuides.ts` renders in full on every race page, which is now
the only place it is published. Venue analysis for a weekend belongs in that
weekend's write-up.

## Rules

1. **A new page must carry something no other page on this site carries.** Not
   a new arrangement of facts that already exist here. Before adding one, run
   the duplication check below against the pages it will sit beside.

2. **When two pages overlap, the weaker one canonicalises to the stronger and
   leaves the sitemap.** It stays reachable and linked for players; it just
   stops competing. The shape to copy is `raceWriteupSeo.ts` (race page →
   write-up). Never build a canonical chain: point at the page that is itself
   indexed.

   Treat this as a holding position rather than a resting place. The circuit
   pages sat here for a month and the honest read afterwards was that a page
   worth reading should be merged into the page it duplicates, and a page that
   is not should be deleted and redirected. `circuitPageSeo.ts` was the second
   implementation of this rule and went with them.

3. **Do not add a fifth template.** Bulk-generated per-entity pages are what
   the site already has too many of, and Google treats machine-scaled
   templating as an abuse signal in its own right.

4. **Do not write another `/guides` explainer.** They fail on authority, not
   content — see `project_seo_guides_rank_not_content` in memory. A fifth
   becomes a fifth zero-impression page and cannibalises the one guide already
   pulling 18% of site impressions.

5. **Prefer subtraction.** Removing 23 near-duplicate URLs did more for the
   template ratio than any amount of new prose, and it costs no editorial
   review.

6. **Prefer first-party data to explanation.** Explaining Formula 1 puts the
   site in competition with publications that have covered the sport for
   decades, and it loses: sitewide average position is 57, which is page 6.
   What we hold and nobody else publishes is **how our players picked** — the
   finishing order a few hundred people expected, which is a different fact
   from the order that happened. `consensus.ts` and `SessionConsensus.tsx` are
   the first surface built on that principle; it is the direction for the rest.

7. **Server-render anything a reviewer or a crawler needs to see.** A `<Link>`
   or a paragraph behind a client `useQuery` is absent from the SSR HTML. This
   has bitten the site twice: it orphaned all 11 practice pages, and it left
   every unopened round's server HTML ending in the placeholder "Check back
   soon" instead of a real date.

8. **Never expose picks before a session locks.** `getSessionConsensus` returns
   null until the deadline. Publishing the crowd's order early would turn
   picking into copying and flatten the leaderboard it feeds. This is a product
   rule, not an SEO one, and it outranks any indexation argument.

## How to measure

```
pnpm --filter @grandprixpicks/web check:duplication
```

That script is this section, made repeatable, and it is the one to run before
requesting a review or adding a page. It reports content words per page with
the chrome subtracted, the templated ratio, worst sibling overlap inside each
template, and every page's closest match anywhere on the site, and it exits
non-zero on cross-template overlap at or above 50%.

Two things it has to get right, both of which a hand-rolled version gets wrong.
The chrome is measured rather than assumed, because the 135 words move when the
footer does; they were 138 on 2026-09-08. And it is measured by majority rather
than unanimity: a strict common suffix across all pages returned 0 words of
footer on one run and 118 on the next, because `/f1-predictions-this-weekend`
renders a signed-out "Sign in" control after its footer and whether that reaches
the crawler depends on the edge cache.

Baseline, measured against prod on 2026-09-08 after the practice pages and
three guides were removed:

|                        | 2026-09-06 refusal | after circuit pages | now      |
| ---------------------- | ------------------ | ------------------- | -------- |
| Sitemap URLs           | 82                 | 58                  | **42**   |
| Templated              | 72%                | 71%                 | **60%**  |
| Worst overlap anywhere | 67-74%             | 37%                 | **37%**  |
| Cross-template at 50%+ | 19 pages           | none                | **none** |

The 67-74% band that got the circuit pages deleted is gone, and the worst
figure left is 37% between two race pages, inside the 17-35% band this doc
calls normal. Templates are now race (18), write-up (5) and guide (2), with 17
standalone pages.

The manual version, if the script is ever in doubt:

```
curl -s https://grandprixpicks.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g'
```

Fetch each URL, strip scripts/styles/head, strip tags, drop the shared chrome
(compute it as the common word prefix and suffix across all pages — do not
hardcode 135, it moves when the header or footer changes), then report:

- content words per page, ascending;
- for each templated group, the share of 5-word shingles each page shares with
  a **sibling** in the group;
- for each page, the single other page on the site it overlaps most with. This
  last one is what found the circuit problem, and the sibling-only comparison
  missed it entirely.

## Before requesting another review

- Deploy first. The 2026-08-13 rejection graded the pre-fix site because the
  review was requested before the content deploy landed.
- Wait for Search Console to show the changes indexed. Repeat requests with no
  substantive change slow subsequent ones.
- The evergreen guides were written by Claude and are **not fact-checked**.
  That is a standing risk on an editorial review. The 22 circuit guides were
  the larger part of it and are deleted.
- The five race write-ups **were** audited on 2026-09-08, every claim against
  the raw text of the article cited beside it. Four fabrications and three
  wrong figures came out of it; see `docs/race-writeup-lifecycle.md` for how
  and what to repeat. That leaves the guides and `circuitGuides.ts`, which
  still renders on every race page, as the unchecked prose on the site.
