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

| Metric           | Baseline |
| ---------------- | -------: |
| Clicks           |       17 |
| Impressions      |    1,110 |
| CTR              |     1.5% |
| Average position |     33.1 |

Search Console Insights' last-28-day comparison reports 15 clicks (+650%) and
1,060 impressions (+1,929%). The growth is real, but the absolute sample is too
small to optimize around percentages alone.

Top queries shown in the Performance report:

| Query                  | Clicks | Impressions |
| ---------------------- | -----: | ----------: |
| f1 picks               |      1 |          37 |
| grand prediction       |      1 |           4 |
| f1 standings           |      0 |          34 |
| gp prediction          |      0 |          26 |
| formula 1 picks        |      0 |          25 |
| gp picks               |      0 |          14 |
| f1 predictions         |      0 |          14 |
| grand pick             |      0 |          13 |
| formula 1 standings    |      0 |          13 |
| grand prix predictions |      0 |           6 |

Top pages shown in the Performance report:

| Page                                 | Clicks | Impressions | Observed CTR |
| ------------------------------------ | -----: | ----------: | -----------: |
| `/`                                  |     11 |         265 |         4.2% |
| `/races/netherlands-2026`            |      5 |         321 |         1.6% |
| `/about`                             |      1 |          12 |         8.3% |
| `/f1-standings`                      |      0 |         144 |           0% |
| `/guides/f1-points-system-explained` |      0 |          90 |           0% |
| `/races`                             |      0 |          53 |           0% |
| `/guides/f1-race-weekend-format`     |      0 |          42 |           0% |
| `/f1-teammate-battles`               |      0 |          26 |           0% |
| `/leaderboard`                       |      0 |          18 |           0% |
| `/how-to-play`                       |      0 |          15 |           0% |

The homepage and Dutch Grand Prix page account for 16 of 17 clicks. Discovery
is broadening, but most pages are still ranking too low for CTR alone to be a
useful diagnosis.

### Indexing

| Status      | Pages |
| ----------- | ----: |
| Indexed     |    75 |
| Not indexed |    84 |

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

| Deploy date | Pages                                             | Hypothesis                                                                                                                          | Exact change                                                                                                                                                                  | Review date                       | Outcome                                                                                     |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| 2026-08-24  | `/f1-standings`                                   | A direct query-first title earns clicks and moves standings queries upward                                                          | Changed title from “2026 F1 Championship Standings \| Grand Prix Picks” to “2026 F1 Standings: Drivers & Constructors”; added a contextual link to the points guide           | +7 days and +28 days after deploy | Position 61.4 over the 28 days to 2026-09-06; clicks not measurable from the warehouse sync |
| 2026-08-24  | `/circuits` and selected circuit pages            | Strong crawlable internal links cause Google to crawl the discovered URLs                                                           | Added a contextual circuit-index link from `/races`; existing race-to-circuit links, footer link, all-round SSR links and sitemap filtering remain in place                   | +7 days and +28 days after deploy | Crawled and indexed: 14 circuit pages now draw impressions, at positions 62–84              |
| 2026-08-24  | `/` and prediction guides                         | A coherent F1-predictions topic cluster improves discovery and sends informational visitors into the playable flow                  | Added homepage links to standings, points and Top 5 strategy; points and Top 5 guides now link back to the picker; How to Play CTA now opens the picker                       | +7 days and +28 days after deploy | No click effect; the cluster ranks but does not place                                       |
| 2026-08-24  | `/guides/f1-points-system-explained`              | A direct first-sentence answer better satisfies points-system intent                                                                | Opened with the complete 25–1 scoring sequence and recorded `dateModified` as 2026-08-24                                                                                      | +7 days and +28 days after deploy | 250 impressions at position 57.6, unmoved                                                   |
| 2026-08-24  | `/circuits/monza` and `/races/italy-2026`         | A current, useful Monza guide captures growing Italian Grand Prix research demand and leads readers toward predictions              | Updated the shared guide with official circuit dimensions, the 2024 resurfacing and kerb changes, clearer overtaking guidance, and prediction factors beyond engine power     | +7 days and +28 days after deploy | No position movement through the Monza weekend itself                                       |
| 2026-09-04  | `/` and `/f1-2026-italian-grand-prix-predictions` | A homepage link during race week improves discovery of the current editorial prediction guide                                       | Added the registered next-race write-up callout after the public picker; it renders only when the current race has a write-up and automatically follows the write-up registry | +7 days and +28 days after deploy | Write-up drew 5 impressions in its own race week, position 38.4                             |
| 2026-09-03  | `/circuits/madring` and `/races/spain-2026`       | A substantive guide to an unfamiliar new circuit captures Madrid F1 research demand before the inaugural race                       | Replaced the provisional Madring copy with confirmed dimensions, circuit sections, likely overtaking zones and first-race prediction signals while preserving unknowns        | +7 days and +28 days after deploy | Too early; 2 impressions so far                                                             |
| 2026-09-06  | `/f1-2026-italian-grand-prix-predictions`         | An archive that shows the result and how players called it holds a fact no other site has, and gives the page a reason to be linked | Finished write-up now renders the official top five per session and the aggregated player consensus beside it, both server-rendered, and links forward to the next round      | +7 days and +28 days after deploy | Pending                                                                                     |

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

### Checkpoint 2026-09-06

The 2026-08-31 leading-indicator review was missed. This one covers the 28 days
to 2026-09-06.

**Source caveat, read this first.** These numbers come from the Search Console
tables in the PostHog warehouse
(`googlesearchconsole.search_analytics_by_query_page`), not from the console
itself, and **that sync's `clicks` column is not trustworthy**. The table spans
2026-07-23 to 2026-09-03 and records **2 clicks in its entire history**, while
the 2026-09-01 console read in this log recorded 17 clicks in 28 days and
PostHog's own first-party analytics counted 11 visitors referred by google.com
over the same window. Impressions, positions and the query/page split look
consistent with the console reads and are used below; **the click figures in
this table are treated as missing, not as zero.** Confirm clicks in the console
before acting on them.

| Metric       | 28 days to 2026-09-06      |
| ------------ | -------------------------- |
| Impressions  | 1,270                      |
| Clicks       | not measurable (see above) |
| Avg position | ~60                        |

Weekly impressions over the period: 23, 37, 149, 65, 201, 395, 608. Average
position across those same weeks: 23.3, 23.5, 57.2, 49.2, 60.9, 60.5, 60.1.

Read: visibility grew roughly 26x while average position sat flat within a
point for six weeks, because the pages driving the growth entered around
position 60 and stayed there. The impressions are almost entirely head terms
owned by established publications: `f1 driver standings` (107 impressions,
position 63.8), `f1 standings` (103, 62.6), `f1 points system` (47, 55.4). The
one term ranking anywhere useful is `gp prediction` at position 18.1, on 10
impressions.

First-party traffic the same 28 days, which does not depend on the sync above:
**109 unique visitors**, 347 sessions. By channel, Direct 57, Email 24, Organic
Search 22, Referral 13, Organic Social 8. Referring domains: google.com 11,
bing.com 5, t.co 5, duckduckgo 3, reddit 3. Most of it is existing players
arriving from our own notification emails, so acquisition from search is very
small in absolute terms whatever the exact click count.

Decision: stop treating page count as the lever. Five race write-ups shipped
since the last review and average position did not move a point; the Monza
write-up drew 5 impressions in its own race week. The constraint is authority
and distribution, and the asset that supports both is aggregated player
consensus, which no other site can publish. That is now on the finished Monza
write-up beside the official result.

Do not write a sixth guide or a page that duplicates a template. See
`seo-content-policy.md`.

### Checkpoint 2026-10-13

Read from the Search Console UI, not the PostHog sync, so clicks are real. The
2026-09-21 checkpoint was recorded only in project notes: 47 clicks, 3.59K
impressions, position 35.2 over 28 days.

| Metric       | 28 days to 2026-10-13 |
| ------------ | --------------------- |
| Clicks       | 146                   |
| Impressions  | 4.4K                  |
| CTR          | 3.3%                  |
| Avg position | 17.3                  |

| Page                                         | Clicks | Impr | CTR   | Position |
| -------------------------------------------- | ------ | ---- | ----- | -------- |
| `/`                                          | 40     | 716  | 5.6%  | 10.5     |
| `/f1-2026-azerbaijan-grand-prix-predictions` | 37     | 553  | 6.7%  | 8.1      |
| `/f1-2026-bahrain-grand-prix-predictions`    | 24     | 338  | 7.1%  | 8.1      |
| `/f1-predictions-this-weekend`               | 20     | 468  | 4.3%  | 13.9     |
| `/leaderboard`                               | 12     | 62   | 19.4% | 6.1      |
| `/f1-2026-singapore-grand-prix-predictions`  | 6      | 173  | 3.5%  | 9.4      |
| `/f1-team-mate-battles`                      | 1      | 212  | 0.5%  | 6.6      |
| `/results-policy`                            | 2      | 117  | 1.7%  | 6.8      |
| `/f1-2027-driver-line-up`                    | 0      | 200  | 0%    | 11.0     |
| `/guides/f1-points-system-explained`         | 0      | 728  | 0%    | 41.6     |
| `/f1-standings`                              | 0      | 357  | 0%    | 34.0     |

Queries: `f1 predictions this weekend` 7.9, `free f1 predictions this weekend`
5.0, `f1 picks` 14.6 (45.2 on 2026-09-01). `f1 predictions` 97 impressions at
21.9 with no clicks. `h2h f1 meaning` 48 impressions at 4.6 with no clicks.

Indexing: 50 indexed, 139 not. The noindex group (50) is profiles and the
race pages that canonicalise to their write-ups, as intended. The Mexico City,
São Paulo and Las Vegas write-ups were "Discovered, currently not indexed",
never crawled twelve days after publishing. The 404s are template URLs found in
June and July (`/races/$raceSlug/`, `/p/$username/followers`); prod no longer
emits them.

Changes made the same day:

- Every write-up from Austin on links the following round's write-up
  (`RaceWriteupNextRound` with `followingRound`), so the crawled write-up leads
  to the uncrawled one.
- `/f1-team-mate-battles` title adds "(H2H)" and the description opens by
  saying what H2H means.

Decision: wait. Re-read the write-up indexing status and the H2H page CTR at
the next checkpoint.

### Next checkpoint

**2026-10-27**, two days after Austin. Check that Mexico City is indexed and
ranking before its 1 November race, and the `/f1-team-mate-battles` CTR.
