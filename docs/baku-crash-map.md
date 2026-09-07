# Baku crash map

A scoped, one-off feature for the Azerbaijan write-up
(`apps/web/src/routes/f1-2026-azerbaijan-grand-prix-predictions.tsx`): an
interactive map of the Baku City Circuit showing where cars have hit the wall
since 2023, which corners claim the most, and who they claimed.

**This is deliberately not a template.** It ships for Baku only. No shared
`CrashMap` abstraction, no per-circuit route, no data pipeline that runs on a
schedule. If it earns a second circuit later, that is a separate decision made
with evidence, and rule 3 of `docs/seo-content-policy.md` ("do not add a fifth
template") applies to it then.

## Why this one is worth building

Rule 6 of the SEO content policy says prefer first-party data to explanation.
This is not first-party data: OpenF1 holds it. But nobody has assembled it into
a per-corner picture of one circuit, and the assembly is the product. It is the
same bet as player consensus, one step removed: not a fact we own, but a shape
nobody has published.

It also sits on a page that already exists and already ranks, adds no URL, and
adds no template. The AdSense risk is zero.

## What the data probes confirmed

Run against the live APIs on 2026-09-07. These numbers are real, not estimates.

**Coverage.** OpenF1 has three complete Baku meetings: 2023 (`meeting_key`
1207), 2024 (1245) and 2025 (1269). Fifteen sessions total.

2023 is the only sprint weekend Baku has ever held, and it was the debut of the
standalone Sprint Shootout format that is now called Sprint Qualifying. 2024 and
2025 ran the conventional three-practice weekend, and **2026 does too**: meeting
1295 is FP1, FP2, FP3, Qualifying and Race, with the race at `session_key`
11377. That matters for the filter design below.

**Raw incident volume**, counted across all fifteen sessions:

| Signal | Count |
| --- | --- |
| Red flags | 18 |
| `TURN n INCIDENT` race-control messages | 14 (these come in NOTED + REVIEWED pairs, so ~7 unique) |
| Classified DNFs (`session_result.dnf`) | 11 |

The 2025 qualifying session alone threw **six** red flags. 2024 FP1 threw
three. The headline is that practice and qualifying, not the race, are where
Baku's walls do their work, which is the finding that makes the piece worth
reading.

After deduping the NOTED/REVIEWED pairs and merging a red flag with the DNF and
turn message that caused it, expect **roughly 25 to 35 distinct incidents**.
That is enough for a real map. It would not have been if we had limited it to
races.

**Endpoints that work.**

- `GET /v1/sessions?circuit_short_name=Baku` enumerates the sessions.
- `GET /v1/race_control?session_key=…` gives flags with `scope`, `sector`
  (marshal sector, 1-21) and free-text messages that frequently name the turn
  outright: `TURN 2 INCIDENT INVOLVING CARS 11 (PER) AND 55 (SAI) NOTED -
  CAUSING A COLLISION`.
- `GET /v1/session_result?session_key=…` carries a boolean `dnf` per driver.
  This endpoint is newer than most OpenF1 documentation suggests; it works.
- `GET /v1/location?session_key=…&driver_number=…&date>…&date<…` gives x/y/z at
  ~3.7Hz. **Windowing is mandatory**: one driver for one minute is 223 points
  and 28KB, so a full session across the field would be tens of megabytes.
  Fetch only a narrow window around each known incident.

**Track geometry.** Every OpenF1 meeting carries a `circuit_info_url` pointing
at `api.multiviewer.app/api/v1/circuits/144/<year>`. That returns an 837-point
`x`/`y` centreline, 20 numbered `corners` each with a `trackPosition`, 21
`marshalSectors` with positions, and a `rotation` (357 for Baku). Critically,
**it is the same coordinate space as OpenF1's `location` endpoint**, so an
incident's telemetry position drops onto the outline with no registration step.

## What the fetched data actually shows

Stage 1 ran on 2026-09-07. Output is in `artifacts/baku-crash-map/`:
`candidates.json`, `summary.json`, and the raw payloads under `raw/`.

**35 candidate messages across the fifteen sessions.** After collapsing the
NOTED/REVIEWED steward pairs, that is roughly 22 to 25 distinct incidents.

**Bucket split** is healthy and justifies the filter: Qualifying 14, Race 11,
Practice 10. The Qualifying number is inflated by 2025 alone, which threw six
red flags.

**Only 16 of 35 carry a location.** The turns named so far:

| Turn | Located incidents |
| --- | --- |
| 2 | 5 |
| 6 | 4 |
| 3 | 3 |
| 5 | 2 |
| 1 | 1 |
| 4 | 1 |

### The sampling bias that must be fixed before publishing

That table is not the answer. It is an artefact of *which* incidents race
control describes, and publishing it as-is would be actively misleading.

The nineteen unlocated candidates are almost all bare `RED FLAG` messages, which
carry no turn, no driver and a null sector. The sixteen located ones are almost
all `TURN n INCIDENT INVOLVING CARS…` collision notes and recovery-vehicle
callouts.

Those are two different kinds of event. Collisions between cars get a turn in
the message. A driver putting it in the wall on their own gets a red flag and
nothing else. So the located subset is systematically biased toward racing
incidents in the opening sequence, while the solo wall hits, which are what Baku
is actually famous for, are exactly the ones with no location attached.

A map built on the located subset alone would claim Baku's danger lives at turns
2 to 6. Any reader who knows the circuit would immediately, and correctly, not
believe it.

**Consequence: an API-only version of this feature cannot be honest.** That
finding is what drove the scope decision in the next section. Resolving the
nineteen bare red flags from telemetry was the original answer; researching the
weekends directly is a better one, and it also reaches back before 2023.

The method for each red flag: take the window from the red flag back to the
preceding green, pull `location` for the field across it, find the car whose
position stops changing, and match the stopping point to the nearest corner.
Cross-check against `session_result` for a DNF and against the following
`RECOVERY VEHICLE ON TRACK AT TURN n` message where one exists, which is an
independent location signal and appears five times in the current data.

If stage 2 cannot resolve most of the nineteen, do not ship a partial map. Fall
back to a per-session incident table with the honest locations we do have, which
is still a decent section and makes no claim it cannot support.

## Scope: researched, not scraped

**Decision (2026-09-07): every session, every Baku weekend since 2016,
research-led and cited. The API is corroboration, not the source.**

This reverses two earlier positions in this doc, both of which were wrong for
the same reason: they treated OpenF1's coverage as the boundary of what is
knowable.

### Why not race-only-and-deeper, or all-sessions-and-shallow

Those were the two options on the table, and both accept a constraint that only
exists if the data comes from an API. Hand research removes the tradeoff, so
take neither.

Race-only would also cut the best material. Baku's most-remembered incidents are
disproportionately *not* races: Leclerc into the Turn 8 barriers in 2019
qualifying, radioing "I am stupid", is the single most replayed Baku crash there
is, and the kerbs at that corner were changed afterwards.

### What research yields, measured not assumed

Spot-checked against the 2018 race report, which produced eight incidents with
corner attribution for most: Räikkönen and Ocon at Turn 2 and again at Turn 3 on
lap 1, Sirotkin into Alonso and Hülkenberg, Hülkenberg into the wall at Turn 4
on lap 11, Verstappen and Ricciardo colliding on lap 40, Grosjean hitting the
wall behind the safety car on lap 43, Bottas's puncture on lap 49.

Nine race weekends have been held here: the 2016 European Grand Prix, then the
Azerbaijan Grand Prix in 2017, 2018, 2019, 2021 (2020 was cancelled), 2022,
2023, 2024 and 2025. At roughly eight incidents each, that is **70 to 100
incidents, against 22 to 25 from the API**, and it reaches back through the
seasons that built the circuit's reputation.

Note that 2016 ran as the European Grand Prix at the same venue. `circuits.ts`
already separates race identity from circuit for exactly this reason, so the
model handles it. Label it as the European Grand Prix and let it sit on the same
map.

### The claim to give up

Not scope: the **completeness claim**. "All Baku crashes since 2023" promises an
exhaustive dataset, and the previous section proves we cannot deliver one. A
curated, cited set of notable incidents promises something we can actually back.

This is not a lesser product. The meme this feature is chasing, a corner as a
driver's reserved parking space, is built entirely on incidents people remember.
A statistically complete map of FP2 red flags has no memetic value at all.
Notability is the product, not a compromise on the way to it.

Retitle accordingly: name the date range, drop the word "all".

### What this simplifies

**Corner resolution, not metre resolution.** Pre-2023 weekends have no telemetry,
so every incident is placed at its corner's position rather than at exact
coordinates. Applying that uniformly means the 2016 incidents are exactly as good
as the 2025 ones, instead of nine years of second-class rows.

It also **removes stage 2 from the critical path**. The windowed-telemetry work
to resolve nineteen bare red flags was the riskiest task in this plan and it is
now optional: research identifies the driver and corner for those sessions
directly. Keep the telemetry idea in reserve for an incident that research
cannot place.

And the joke lands better at corner resolution anyway. "Turn 15 has eaten seven
cars" is the finding. Exact coordinates are not.

### Sourcing rules

- **Every incident carries a citation.** This is what makes the deeper history
  legitimate, and it was the sole objection when this doc ruled pre-2023 out.
- **Wikipedia race reports are the index, not the source.** Use them to find
  incidents fast, then cite formula1.com, RaceFans, Autosport or the FIA
  document for anything load-bearing.
- **Cross-check against the fetched API data for 2023-2025.** It gives exact
  dates, sessions, driver numbers and race control's own turn attribution. It
  has already surfaced one discrepancy worth resolving: race control logged the
  2024 Pérez/Sainz collision at Turn 2, while most reports describe it on the
  run to Turn 3. Where the two disagree, say which one the map used.
- **No photos or video.** Unchanged, and non-negotiable: F1 owns and enforces
  all of it. Citations link out.

## Research results, verified (2026-09-07)

`artifacts/baku-crash-map/researched-incidents.json` holds **57 verified
incidents** across all nine Baku weekends, each with a driver, session, corner,
outcome, confidence rating and citation. `tally.json` holds the aggregates.

Every incident has been checked against a second source. **48 rated `high`, 9
`medium`, none unverified.** The nine `medium` rows are sourced but their corner
is either unnamed or disputed; six carry no corner at all and are listed in the
table without being placed on the map.

### The hot corners

| Corner | Incidents |
| --- | --- |
| **Turn 3** | **11** |
| **Turn 15** | **10** |
| **Turn 2** | **7** |
| Turn 1 | 4 |
| Turn 4 | 4 |
| Turn 6 | 4 |
| Turn 7 | 3 |
| Turn 8 | 3 |
| Turn 20 | 2 |
| Turns 5, 11, 13 | 1 each |

Two poles, not one. Turn 3 collects cars in clusters: three in the 2021
qualifying session alone (Ricciardo in Q2, then Tsunoda and Sainz within seconds
of each other in Q3), two more in 2023 qualifying, Piastri in 2025. Turn 15 is
the other, and it spans the whole history: Ricciardo and Pérez there in 2016,
Vettel in 2022, Sargeant in 2023, Leclerc twice, and Grosjean's crash behind the
safety car in 2018.

### Sessions, and a correction

Race 23, Qualifying 21, Practice 13.

The earlier API-only section claims practice and qualifying are where Baku's
walls do their work. **The full history does not support that**: the three
buckets are close, with the race marginally ahead. That earlier read was an
artefact of OpenF1 covering only 2023 to 2025, two of which had freak qualifying
sessions. Do not repeat it in the prose.

### The driver table

Hülkenberg 6, Stroll 6, Ricciardo 5, Pérez 4, Verstappen 4, Räikkönen 4,
Ocon 4, Hamilton 3, Leclerc 3, Tsunoda 3, Colapinto 3.

Hülkenberg and Stroll tied at the top is the most postable fact in the set and
the one that matches the joke the feature came from. Every one of the twelve is
individually cited, which matters because this is the line most likely to be
challenged.

### What verification changed

Checking the eleven flagged rows corrected three facts and removed two rows:

- **Wikipedia was wrong twice.** It places Ricciardo's 2017 qualifying crash in
  Q1, which cannot be right because he qualified tenth; it was Q3, at the exit
  of Turn 6. And it puts the 2025 Albon/Colapinto contact at Turn 7 on lap 17,
  where race control and a contemporary report both say Turn 5 on lap 19.
- **Grosjean's 2018 safety car crash was on the run down to Turn 15**, which
  moved Turn 15 into a near-tie for the top of the table.
- **Two rows dropped**, recorded with reasons under `dropped` in the data file.
  Bottas's 2018 puncture fails the inclusion rules (debris, no contact with a
  wall or car, no corner in any source) and belongs in the prose instead. A
  Turn 2 collision race control logged on lap 1 of the 2023 race names no
  drivers and matches no report, so it cannot be attributed to anyone.
- **Hamilton's 2016 qualifying crash stays disputed.** Three sources give Turn
  9, 10 and 11. All are in the narrow castle-adjacent section, so the map uses
  Turn 11 as the most specific attribution and the note says so.

**2018's practice and qualifying remain a documented gap.** Wikipedia's article
carries a "needs expansion" notice for its qualifying report and no session
detail survives in the sources checked. Either find a contemporary report or
state on the page that 2018's non-race sessions are not covered. Do not fill it
from memory.

## Open decision: where the track outline comes from

The MultiViewer endpoint is a community reverse-engineering of F1 live timing.
Its licensing is unstated, and F1 is litigious about its data.

Recommendation: **fetch it once, by hand, and check the derived path into the
repo as our own coordinate array.** We are not calling their API at runtime,
not redistributing their payload, and the underlying geometry is the physical
shape of a public road. Note the provenance in a comment in the data file so
the next person knows what they are looking at.

The fallback, if that reads as too close for comfort, is to derive the
centreline ourselves from a clean OpenF1 `location` trace of one fast lap. We
confirmed the coordinate spaces match, so this is a drop-in substitute for the
outline. It does not give us corner *numbering*, which would then have to come
from the race-control messages plus a public circuit diagram. Costs about half
a day; only worth it if the licensing question actually bothers us.

Barry's call. Nothing else in the scope depends on it.

## Inclusion rules

Deciding what counts as a crash is the hard part of this feature. A puncture, a
spin that costs nothing, contact that starts at one corner and ends at another:
each needs a call. It is tractable here only because a human makes those calls
once, in advance, and the page states its own criteria. Write the rules down on
the page, in a short "how this was counted" line, so a reader can argue with the
method rather than the data.

**Include** an incident when a car made contact with a wall or another car and
the session recorded a consequence: a red flag, a DNF, a stopped car, or a
`CAUSING A COLLISION` steward note.

**Exclude:** track-limits lap deletions (Turn 15 and Turn 16 generate dozens
and none of them are crashes), unsafe releases, VSC and yellow-flag
infringements, false starts, and mechanical retirements with no contact.

**Corner attribution**, in priority order:

1. The turn named in the race-control message, when there is one.
2. The car's last telemetry position before it stopped, matched to the nearest
   corner in the geometry file.
3. The marshal sector of the *yellow* flag immediately preceding the red, when
   neither of the above resolves. Note that a red flag itself carries
   `scope: "Track"` and a **null sector**, so the red flag alone locates
   nothing. This was checked against the fetched data and the earlier version of
   this doc was wrong about it.

Record which method was used per incident. Where an incident starts at one
corner and ends at another, attribute it to **where the car stopped**, and say
so in the method note.

## Data shape

One hand-checked file, `apps/web/src/lib/baku2026CrashData.ts`, following the
pattern of `lineUp2027.ts`: repo data, no database, no Convex table, no cron.
This is an archive of three completed seasons. It changes when a human edits
it, which is roughly once a year.

```ts
type BakuIncident = {
  /** Stable id, e.g. '2025-quali-sainz-t4'. */
  id: string;
  /** 2016 ran as the European Grand Prix at the same circuit. */
  year: number;
  session: 'FP1' | 'FP2' | 'FP3' | 'Quali' | 'SprintQuali' | 'Sprint' | 'Race';
  /** Three-letter code, matching the roster the site already uses. */
  driver: string;
  team: string;
  /** 1-20. Null only if attribution genuinely failed. */
  corner: number | null;
  /** Map coordinates, in the geometry file's space. */
  x: number;
  y: number;
  /** How the corner was attributed. Shown in the popup. */
  attribution: 'race-control' | 'report' | 'telemetry';
  outcome: 'dnf' | 'red-flag' | 'continued';
  /** One sentence, hand-written. No em dashes. */
  note: string;
  /** Required, not optional. An uncited incident does not go on the map. */
  source: { label: string; url: string };
};
```

Plus `apps/web/src/lib/bakuCircuitGeometry.ts`: the outline path, the 20 corner
positions, and the marshal-sector boundaries. Static, generated once.

**No photos or video.** F1 owns all of it and enforces. The popup is a
hand-written sentence and, where one exists, an outbound link to a report. This
is a real reduction from the original idea and it is not negotiable.

## The map, and what "heatmap" honestly means here

A kernel-density heatmap over 30 points would render as a lie: smooth gradients
implying a continuous field we do not have. Two techniques give the heat
*reading* truthfully.

**1. Marshal-sector shading (the heat).** The track is a ribbon, not a plane,
so the honest heat lives along it. Split the 837-point outline into the 21
marshal sectors and stroke each segment with a colour ramp by incident count.
A reader sees the hot stretch of track at a glance, and every band is a real
integer.

**2. Graduated corner markers (the detail).** A circle at each corner that has
claimed a car, radius scaled by count, sitting on the shaded ribbon. Click or
tap opens the incident list for that corner.

Colour: use the sequential ramp from the `dataviz` skill's guidance rather than
inventing one, and keep team colour out of it. Team colour on this map would
say "whose crash" where the ramp is saying "how many", and the two would fight.
The chartreuse accent stays rare, per the Timing Sheet Minimal direction.

Render as **inline SVG, server-rendered**, not a canvas and not a client-only
component. Policy rule 7: a crawler and an AdSense reviewer must see the
content in the HTML. The coordinates are static, so there is nothing to fetch,
and the whole map is SSR-able with interactivity layered on after hydration.

Accessibility is a real requirement here, not a checkbox: the site has an axe
gate in CI. The map needs a text equivalent, and the cheapest good one is the
per-corner tally table that should be on the page anyway. Markers are
`<button>`s in DOM order, focusable, with the count in the accessible name.

## Filtering

Four buttons: **All**, **Practice**, **Qualifying**, **Race**. Client-side,
operating on data already in the page.

**Sprint sessions fold into the other buckets** rather than getting a tab of
their own: Sprint Qualifying into Qualifying, Sprint into Race. Three reasons,
and they all point the same way.

- Baku has held one sprint weekend, in 2023, and it produced almost nothing: one
  red flag in Sprint Qualifying, and one Sprint DNF (Tsunoda, retired on lap 2)
  that reads more like damage than a wall hit and may not survive the inclusion
  rules at all. A tab holding one incident is a dead tab.
- 2026 is not a sprint weekend, so a Sprint filter answers a question no reader
  of this page is asking.
- The four buckets then map exactly onto the sessions of the weekend the reader
  is picking, which is the whole point of putting this on a predictions page.

**Filter buckets are not data granularity.** The `session` field keeps the exact
session, and an incident card says "2023 Sprint" even while it sits under the
Race filter. Losing that would be lying to save a tab.

Two implementation notes that are easy to get wrong:

1. **Filtering recomputes the heat, not just the markers.** Corner marker radii
   and marshal-sector shading are both functions of the filtered count. If only
   the markers hide, the ribbon keeps showing all-sessions heat under a
   Qualifying filter and the map contradicts itself. Derive both from the same
   filtered array.
2. **SSR renders "All".** Policy rule 7 means every incident must be in the
   server HTML; the filter is a client-side narrowing after hydration, never a
   fetch. A crawler and an AdSense reviewer see the complete set.

Put the count on each button ("Qualifying 14"). It is the cheapest way to make
the finding visible before anyone clicks: on this data, Qualifying and Practice
are going to dwarf Race, which is the surprise the section exists to deliver.

Semantics: a radio group, not tabs, since there is no tab panel per option and
only one view. Keep the pressed state legible without colour alone.

## Page integration

Section heading: **"Every Baku crash since 2023"**. Direct, names the scope,
and the date bound is doing honest work by telling a reader up front that this
is three seasons and not the full circuit history.

Placement: after the existing `RaceSignalsSection` (`What matters in Baku`),
before the FAQ. It supports the pick rather than introducing the weekend.

Note that the Baku page currently has **no track map at all**: Monza and Madrid
use `RaceWriteupTrackMap`, which renders a raster image with a corner legend
and an enlarge control. This feature is a different component
(`BakuCrashMap`, page-scoped), not an extension of that one. It should
nonetheless borrow two things that component learned the hard way: explicit
width and height on the map so it does not reflow (worth 0.1 of CLS above the
fold on a phone), and an enlarge affordance, because corner numbers at 366px
wide are unreadable otherwise.

Two paragraphs of hand-written prose go with it. Not a caption: the finding.
Something to the effect that Baku's reputation is built on the run to Turn 1,
while the data says the castle section is what actually collects cars, and that
qualifying is more dangerous here than the race. Write it after the data is
assembled, from what the data actually says.

Update `raceWriteups.ts`: bump `azerbaijan-2026` `reviewedAt`, and revise
`summary` in the same commit to mention the crash map. The registry comment is
explicit that the summary is revised whenever a section is added.

## What this does and does not do for SEO

**It will not move rankings on its own.** The site's measured bottleneck is
authority, not content: sitewide average position 30.4, and two referring
domains. Bing ranks the same pages at position 2-9 with identical content, which
is the cleanest available proof that the gap is off-page. The four `/guides`
explainers are the control experiment: technically sound, correctly targeted,
zero clicks. Adding a section to a page is a content change, and content is not
the constraint.

So do not build this expecting a ranking lift. Build it for the one thing it can
plausibly do that nothing else on the site does.

**The real mechanism is links.** Nobody links to a predictions page or an
explainer. People do repost "every crash at this circuit, mapped." Referring
domains are the actual constraint, and this is the first asset on the site with
a realistic chance of earning one. That value is realised through Reddit and
social distribution, not through on-page optimisation, which means **the social
card is part of the feature, not a follow-up**. A static PNG of the map, posted
around the Baku weekend, is what does the work. Note that r/formula1 removes
self-promotional links, so that post is the image and the data alone.

**On-page, what it legitimately earns:**

- Genuinely unique content on a page that is already indexed and already ranks,
  which is the cheapest possible place to put it.
- A crawlable text path via the per-corner tally table. The SVG alone would give
  Google nothing.
- No new URL, no fifth template, no duplication surface. The AdSense risk is
  zero, which is worth more here than a ranking gain.

**`Dataset` JSON-LD: yes, but only if we publish the data.** An earlier draft of
this doc said no and overstated the case. One hand-authored block describing a
dataset that genuinely exists is not a machine-scaling signal, and Google Dataset
Search is a real surface, if a small one.

The honest condition is the schema's own quality guidelines: `Dataset` expects
the data to be obtainable, with a `name`, `description`, `license` and a
`distribution` pointing at a download. So the markup should come with a static
`/data/baku-crashes.json` served from the site. That costs nothing (the file is
already built), it is the kind of thing people link to, and it fits the
first-party-data direction better than the map alone does. Publishing the data
and then describing it accurately is legitimate. Describing a dataset nobody can
download is a claim we do not back, and that is the version to skip.

Do not expect traffic from Dataset Search. Do it because the download is link
bait and the markup is true.

Leave the rest of the schema alone: the page already carries SportsEvent and
BreadcrumbList, and `site.ts` notes FAQPage stopped rendering rich results.

**On ranking for the crash terms specifically.** Yes, this can rank, and the
reasoning is better than it first looks. A site with no authority loses every
competitive term, which is what the guides demonstrated. It can still win terms
with no competition, and "baku crash map" has essentially none. Targeting
zero-competition terms is the correct strategy for this site's position, not a
consolation prize.

The caveat is volume, not rankability. Almost nobody searches that exact phrase.
Treat the cluster rather than the string ("baku crashes", "f1 baku crash
history", "which corner do drivers crash at in baku") and expect small numbers.
The value is that a page ranking first for anything is a working demonstration
that the site can rank when it is not fighting publications, and it gives the
social post something to point at.

**One real risk: intent dilution.** This page's title and purpose are
predictions. A substantial crash section targets an adjacent but different query
cluster ("baku crashes", "azerbaijan gp crashes") whose visitors arrived to look
at wreckage, not to make picks. Two consequences worth accepting deliberately:
those visitors will bounce, and a large enough section can shift what Google
thinks the page is about.

Mitigation: keep the section clearly subordinate. It is an H2 inside a
predictions page. Do not put "crash" in the page title, the meta description or
the H1, and do not rewrite the hero around it. If the crash content later proves
it can carry demand on its own, that is the moment to argue about a URL for it,
with evidence, against policy rule 3.

## Accessibility and UX requirements

The site has an axe gate in CI (`tests/e2e/a11y-smoke.spec.ts`) plus Lighthouse
budgets on desktop and mobile, so these are pass/fail conditions, not
aspirations. Add the section to the a11y smoke spec's coverage in the same PR.

**Touch targets.** Markers are scaled by incident count, so a corner with one
incident renders small: a naive radius scale puts it around 8px. WCAG 2.5.8 asks
for 24px, and the codebase's own habit is `min-h-9` (36px). Give every marker a
transparent hit area at the target size regardless of its drawn radius. This is
the single easiest thing to get wrong here.

**Marker overlap at phone width.** Baku's castle section (turns 8-12) is
geometrically tight, and at 366px those markers will collide. Decide the
behaviour before drawing anything: either cluster them into one marker with a
combined count, or offset with short leader lines. Do not discover this at the
end.

**Colour is never the only channel.** The ribbon shading encodes count by hue.
The tally table carries the same numbers as text, and that is the compliant
path. Check the ramp against the dark ground at 3:1 for non-text contrast; the
site is dark-only, so a ramp designed on white will fail.

**Resolve the SVG semantics deliberately.** Markers are interactive, so they are
real `<button>`s and must be reachable. The tally table is then an aggregate
view, not a duplicate announcement, and should be introduced by a caption that
says so. Do not both expose the markers and mirror them row-for-row in a
visually hidden list: screen reader users get the whole dataset twice.

**Keyboard load.** Up to twenty markers, four filters and an enlarge control is a
lot of tabbing for anyone who just wants to reach the next section. Use a roving
tabindex across the marker group so it costs one tab stop, with arrow keys
moving between corners.

**Announce filter changes.** Changing the filter silently rewrites the map. An
`aria-live="polite"` region reporting "14 incidents, qualifying" is a single
element and makes the control usable non-visually.

**Reuse `useModalDialog`** for the incident popup and the enlarged view. Focus
trap, escape to close and focus restoration are already solved there; hand-rolling
them is how the escape key ends up not working.

**Respect `prefers-reduced-motion`** if markers transition on filter change.

**Touch has no hover.** The popup opens on click or tap. Hover may preview on a
pointer device, but nothing may be hover-only.

**Filter state persists into the enlarged view.** Enlarging is a zoom, not a
reset. Filtering to Qualifying and then enlarging to a full-map "All" is a bug
that will feel like one.

**CLS.** Explicit width and height on the SVG, as `RaceWriteupTrackMap` learned:
this sits above the fold on a phone and a reflow was worth 0.1 there.

## Tasks

| # | Task | Est. |
| --- | --- | --- |
| 1 | ~~Fetch OpenF1 sessions, race control, results.~~ **Done 2026-09-07.** `apps/web/scripts/fetch-baku-crash-data.mts`, output in `artifacts/baku-crash-map/`. | done |
| 2 | ~~Research pass across nine weekends.~~ **Done 2026-09-07.** 59 incidents in `artifacts/baku-crash-map/researched-incidents.json`. | done |
| 2b | ~~Verify the flagged incidents.~~ **Done 2026-09-07.** All 57 second-sourced; 3 facts corrected, 2 rows dropped. | done |
| 3 | Reconcile research against the fetched API data for 2023-2025. Resolve turn disagreements and record which source won. | 1-2h |
| 4 | Write the `baku2026CrashData.ts` file: apply inclusion rules, write the one-line notes, final citation check. | 2-3h |
| 5 | Geometry file: outline path, corner positions, marshal sectors, normalised and rotated for display. | 1h |
| 6 | `BakuCrashMap` component: SVG ribbon shading, graduated markers, popup, focus order, enlarge. | 3-4h |
| 7 | Per-corner tally table (doubles as the accessible text equivalent). | 1h |
| 8 | Filter control: four buckets, counts, shared derivation of markers and shading. | 1-2h |
| 9 | Prose, section wiring, `raceWriteups.ts` update. | 1-2h |
| 10 | Tests: data file invariants (corners in 1-20, every incident cited, ids unique), component render, axe spec coverage. | 1-2h |
| 11 | Static social card render of the map, for the weekend post. | 1-2h |
| 12 | Publish `/data/baku-crashes.json` and its `Dataset` JSON-LD. | 1h |

Around three and a half days, up from two and a half, and the increase is
almost entirely task 2. That is the right place to spend it: the research is
what the feature is, and it is the part that cannot be regenerated by rerunning
a script.

Telemetry resolution of unlocated red flags is held in reserve, not scheduled.
Reach for it only if research leaves an incident worth showing and unplaceable.

## Out of scope

- Any other circuit.
- Exhaustiveness. The page covers notable, cited incidents, and says so.
  Someone will always find one we left out; the citation policy is what makes
  that a gap rather than an error.
- Metre-accurate incident positions. Corner resolution throughout.
- Convex tables, cron jobs, live updating. The 2026 race adds one row to a
  hand-edited file after the weekend, if we care to add it.
- A shared crash-map abstraction. Build the second one before generalising, if
  there is ever a second one.

## Risks

**The finding might be boring.** If the incidents scatter evenly around the lap
with no hot corner, there is no story and the map is decoration. Task 1 and 2
answer this before any UI work starts, which is why they are first. If the data
is flat, stop, and we have spent four hours.

**Thirty points across twenty corners is thin**, and a reader who knows the
circuit will notice that 2016-2022 is missing. The date in the heading is the
mitigation: claim three seasons, deliver three seasons.

**OpenF1 is already a deploy dependency.** `scripts/cloudflare-build.sh` smoke
tests it, and a live-session 401 has blocked a deploy before. This feature adds
no runtime dependency on it (all data is checked in), and it must stay that
way.
