# Search strategy and Search Console log

This is the experiment log for organic search. Record a baseline before a
change, keep the change set small, and add the outcome after Google has had time
to recrawl. A seven-day check is useful for leading indicators; avoid declaring
a ranking experiment won or lost from one week of low-volume data.

## Baseline — 2026-08-24

Search Console data was updated on 2026-08-24 for performance (through
2026-08-22) and 2026-08-21 for indexing.

### Performance

The three-month report currently contains roughly one month of data
(2026-07-23–2026-08-22):

| Metric | Baseline |
| --- | ---: |
| Clicks | 17 |
| Impressions | 1,110 |
| CTR | 1.5% |
| Average position | 33.1 |

Search Console Insights' last-28-day comparison reports 15 clicks (+650%) and
1,060 impressions (+1,929%). The growth is real, but the absolute sample is too
small to optimize around percentages alone.

Top queries shown in the Performance report:

| Query | Clicks | Impressions |
| --- | ---: | ---: |
| f1 picks | 1 | 37 |
| grand prediction | 1 | 4 |
| f1 standings | 0 | 34 |
| gp prediction | 0 | 26 |
| formula 1 picks | 0 | 25 |
| gp picks | 0 | 14 |
| f1 predictions | 0 | 14 |
| grand pick | 0 | 13 |
| formula 1 standings | 0 | 13 |
| grand prix predictions | 0 | 6 |

Top pages shown in the Performance report:

| Page | Clicks | Impressions | Observed CTR |
| --- | ---: | ---: | ---: |
| `/` | 11 | 265 | 4.2% |
| `/races/netherlands-2026` | 5 | 321 | 1.6% |
| `/about` | 1 | 12 | 8.3% |
| `/f1-standings` | 0 | 144 | 0% |
| `/guides/f1-points-system-explained` | 0 | 90 | 0% |
| `/races` | 0 | 53 | 0% |
| `/guides/f1-race-weekend-format` | 0 | 42 | 0% |
| `/f1-teammate-battles` | 0 | 26 | 0% |
| `/leaderboard` | 0 | 18 | 0% |
| `/how-to-play` | 0 | 15 | 0% |

The homepage and Dutch Grand Prix page account for 16 of 17 clicks. Discovery
is broadening, but most pages are still ranking too low for CTR alone to be a
useful diagnosis.

### Indexing

| Status | Pages |
| --- | ---: |
| Indexed | 75 |
| Not indexed | 84 |

The 84 exclusions comprise 27 intentional `noindex` URLs, 27 alternate
canonicals, five 404s, four redirects, 13 discovered but not indexed, and eight
crawled but not indexed. The first four categories are not automatically
problems; review their example URLs before attempting to reduce the headline
count.

The 13 discovered-but-not-indexed examples visible in Search Console include
`/circuits`, circuit guides for Barcelona, Marina Bay, Miami, Monaco and
Silverstone, `/f1-2027-calendar`, practice pages, and older 2026 race pages.
They have no recorded crawl yet.

The “page indexed without content” example is
`https://clerk.grandprixpicks.com/`, not an application page. The managed Clerk
host currently returns `X-Robots-Tag: noindex, nofollow`. A new Search Console
validation was started on 2026-08-24 so Google can recrawl and remove it from
the index.

The five reported 404s are `https://t.grandprixpicks.com/`, the literal route
templates `/races/$raceSlug/`, `/p/$username/followers`, and
`/p/$username/following`, plus the absent `/races/saudi-arabia-2026`. None is a
current canonical application URL or present in the sitemap. They should remain
404s unless a real replacement URL is introduced; redirecting arbitrary or
template URLs would give crawlers a false signal.

## Strategy for the next review period

### 1. Consolidate the topic Google is already recognizing

Treat “F1 picks / F1 predictions” as the primary acquisition cluster. Keep the
homepage as the game-intent landing page and strengthen relevant internal links
to it from race, how-to-play, and guide pages. Race pages should target the
specific Grand Prix prediction intent rather than compete with the homepage for
the generic term.

Do not create thin pages for every query variation (`gp picks`, `formula 1
picks`, etc.). Use those natural variants in useful body copy and headings
where they fit.

### 2. Work the highest-impression non-click opportunities

Prioritize, in order:

1. `/f1-standings`: confirm that its live title/snippet clearly promises current
   2026 driver and constructor standings and that it is updated immediately
   after races. Its 144 impressions and the standings queries are the clearest
   non-click opportunity.
2. `/guides/f1-points-system-explained`: answer the core question immediately,
   keep the visible updated date accurate, and link contextually to standings
   and the prediction game.
3. `/races/netherlands-2026`: preserve what is working, but make the snippet and
   opening copy time-aware as the event moves from upcoming predictions to
   results/recap. Avoid changing both title and main content at once.

At current average position (33.1), content relevance and internal authority
are the main constraint. A global title rewrite is not justified by this data.

### 3. Improve crawl paths before requesting indexing

Ensure `/circuits` is linked from stable site navigation or another strong
index page and that circuit pages are linked with descriptive anchor text from
the circuit index and relevant race pages. Do the same for practice pages only
if they provide durable standalone value. If a practice page is thin or useful
only briefly, remove it from the sitemap or canonicalize/noindex it deliberately
rather than trying to force indexing.

After deployment, inspect `/circuits`, one representative circuit URL, and
`/f1-2027-calendar` in Search Console. Request indexing for these representative
pages only after confirming a 200 response, self-canonical, indexable robots
directive, meaningful server-rendered content, and internal links. Then start
validation for the affected indexing issue.

### 4. Resolve the concrete coverage anomalies

Identify the example behind “page indexed without content.” Review the five 404
examples against the sitemap and internal links. Leave expected `noindex`,
canonical, and redirect exclusions alone.

## Experiment record

Add one row per deployed change. Use the deploy date, not the coding date.

| Deploy date | Pages | Hypothesis | Exact change | Review date | Outcome |
| --- | --- | --- | --- | --- | --- |
| TBD | `/f1-standings` | A direct query-first title earns clicks and moves standings queries upward | Changed title from “2026 F1 Championship Standings \| Grand Prix Picks” to “2026 F1 Standings: Drivers & Constructors”; added a contextual link to the points guide | +7 days and +28 days after deploy | Pending |
| TBD | `/circuits` and selected circuit pages | Strong crawlable internal links cause Google to crawl the discovered URLs | Added a contextual circuit-index link from `/races`; existing race-to-circuit links, footer link, all-round SSR links and sitemap filtering remain in place | +7 days and +28 days after deploy | Pending |
| TBD | `/` and prediction guides | A coherent F1-predictions topic cluster improves discovery and sends informational visitors into the playable flow | Added homepage links to standings, points and Top 5 strategy; points and Top 5 guides now link back to the picker; How to Play CTA now opens the picker | +7 days and +28 days after deploy | Pending |
| TBD | `/guides/f1-points-system-explained` | A direct first-sentence answer better satisfies points-system intent | Opened with the complete 25–1 scoring sequence and recorded `dateModified` as 2026-08-24 | +7 days and +28 days after deploy | Pending |

### Implementation note — 2026-08-24

The Dutch Grand Prix requirement needed no new code. Race metadata already
switches automatically from “Predictions” and pick-focused copy to “Results”
and result-focused copy when the race status becomes `finished`. Keeping this
logic avoids a Netherlands-only exception and applies the same lifecycle to
every race.

## Weekly review checklist

Use identical Search Console filters each time: Web search, compare the latest
seven complete days with the previous seven, and also retain a 28-day view to
reduce daily noise.

- Record total clicks, impressions, CTR, and average position.
- Record page-level clicks, impressions, CTR, and position for each changed URL.
- Record query-level metrics for `f1 picks`, `f1 predictions`, `f1 standings`,
  `formula 1 standings`, and any page-specific race query.
- Note whether changed pages were crawled after deployment; do not attribute a
  result to a change Google has not crawled.
- Recheck indexed, discovered-not-indexed, crawled-not-indexed, 404, and
  indexed-without-content counts and examples.
- Annotate race-week timing, deployments, major content releases, and unusual
  referral activity. F1 demand is event-driven, so raw week-over-week traffic
  is not a clean causal measure.
- Decide: keep, iterate, revert, or wait. At this traffic level, default to
  waiting for the 28-day read unless there is a technical regression.

### Next checkpoint

First leading-indicator review: **2026-08-31**. Compare complete days where
possible; Search Console commonly lags, so move the check by a day if the latest
data is incomplete. The more meaningful evaluation is **2026-09-21**, roughly
28 days after this baseline.
