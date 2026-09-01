# Race write-up lifecycle

Race write-ups are the reading surface for a Grand Prix weekend. The race page
is the game: picks, locks, results and scores. A write-up helps a fan decide
what to pick, using circuit facts and sourced news, and becomes a useful
archive after the result. It does not publish a house Top 5. Picks stay
private until the relevant session locks; if aggregated player picks appear,
they belong in the finished archive, after the event, not in the preview.

This process applies to every route registered in
`apps/web/src/lib/raceWriteups.ts`.

## Publishing overlap

Work on consecutive write-ups overlaps. Publish the next race's durable page
seven to ten days before its first practice session. Do not wait for the current
race to finish.

After the current race, complete one archive pass and move editorial attention
to the next round:

- Sunday: add the official result, and aggregated player picks when they exist.
- Monday: confirm penalties and the official classification, remove unresolved
  language, update internal links, and freeze the page.
- Reopen the page only for a factual correction or an amended official result.

## Page phases

The web app derives a page phase from race status and session lock times. Use
the phase as the contract for copy, modules and actions.

| Phase        | Boundary                        | Reader's job                                  | Page behavior                                                                                        |
| ------------ | ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Preview      | Published until FP1             | Understand the circuit and make an early call | Show schedule, forecast, known changes, durable analysis and both prediction actions                 |
| Evidence     | FP1 until qualifying locks      | Use on-track evidence                         | Keep live modules current and explain only evidence that can change a pick                           |
| Race picks   | Qualifying lock until race lock | Make the race Top 5                           | Freeze the qualifying call and move the primary action to race picks                                 |
| Picks locked | Race lock until results publish | Review the submitted call                     | Remove forecasts and decision prompts; do not claim that results exist yet                           |
| Finished     | Race results published          | Compare the field with the result             | Show the official result; aggregated player picks belong here when they exist; link to the next race |

| Cancelled | Race status is cancelled | Understand what happened | Remove prediction prompts and show the race detail or cancellation notice |

The database status is authoritative for finished and cancelled races. A clock
crossing the scheduled race start only means picks are locked.

## Editorial updates

### Initial publication

Publish the durable foundation:

- event identity, session schedule and track time zone;
- the circuit traits that affect a Top 5;
- tyre nomination when confirmed;
- championship standings as they currently are, naming any round still to be
  scored before this weekend;
- known penalties, driver availability and material car changes;
- links to the race page and circuit guide.

The title names predictions because that is what the reader is here to make.
Do not invent a Grand Prix Picks Top 5 to satisfy the title. Circuit facts,
tyres, standings and sourced news are the preview. Aggregated player picks,
when they exist, wait until the finished phase.

### Friday after FP2

This is the main evidence update on a regular weekend. Compare representative
laps, long runs, tyre use, tow effects and reliability. Add only what can
change a pick.

### Saturday after FP3

Record the last practice evidence that still affects qualifying. Do not
publish a house qualifying order.

### Saturday after qualifying

Record the official qualifying classification and starting-grid changes. Keep
qualifying classification and starting position distinct when penalties apply.

### Sunday and Monday

After results publish, place the official Top 5 on the page. When aggregated
player picks exist, show them beside that result and how they scored. Add a
short account of the facts that decided the result. This is an archive, not a
full race report.

## Update gate

Edit a live write-up only when at least one condition is true:

- a penalty or driver change affects scoring or availability;
- conditions materially alter the likely result;
- a completed session supplies evidence needed for the next pick;
- the race has ended and the page must become an accurate archive;
- a factual error or official amendment needs correction.

Do not publish filler updates, repeat a headline without explaining its effect
on a pick, or change dates merely to make the page appear fresh.

## Content ownership

Use one source for each kind of information:

- `raceNews`: discrete, sourced weekend events that affect a prediction;
- weather component: forecast data and its own update time;
- race and standings queries: schedule, status and championship data;
- write-up route: circuit analysis and sourced context that is not a discrete
  weekend news item;
- race page: submitted picks, official results and player scores;
- circuit guide: facts that remain useful across seasons.

Time-sensitive sections render only while a pick can still change. Durable
circuit analysis remains in the archive. Aggregated player picks, when built,
render in the finished phase only.

## Dates and metadata

`reviewedAt` in the write-up registry means the hand-written content was
substantively checked. Update it for a meaningful editorial revision. Automated
weather refreshes and newly fetched data display their own timestamps and do
not move `reviewedAt`.

Keep the year-specific URL and canonical after the race. Do not redirect an old
write-up to the next season. Link it to the next round and, when published, the
next write-up for the same circuit.

Structured data must describe the same event and state shown on the page. A
cancelled race uses `EventCancelled`. Metadata and visible copy must not promise
predictions or results that the current phase does not provide.

## Accessibility and performance

- Express the phase and lock state in text. Do not rely on color.
- Keep heading order, semantic lists and definition lists intact.
- Keep stable `id`s on durable headings so a shared URL can land on that
  section. Do not treat live-only module ids as shareable; they disappear in
  the archive.
- Keep track time zones visible beside session times.
- If a page updates while open, announce only the concise changed status. Do
  not put the whole article in a live region.
- Server-render public content and metadata.
- Cache public reads. Do not poll the browser to make the article appear live.
- Reserve space for modules that change at phase boundaries to avoid layout
  shift.
- Remove expired live modules from the archive instead of continuing to fetch
  and render them.

## Distribution and measurement

Each substantive phase change can support one social post: initial preview,
post-FP2 evidence, and the archive once results publish. A weather refresh
alone is not a distribution event.

When scheduling through Buffer, draft and validate the post before publishing.
Use campaign links that identify the race and phase. Compare social clicks with
page analytics; Buffer engagement by itself does not measure whether a visitor
made picks.

Review the pattern after three race weekends using:

- Search Console queries and landing-page clicks by phase;
- organic landing to race-page and pick-start conversion;
- pick completion before each session lock;
- prediction scorecard engagement;
- field Core Web Vitals and accessibility test results;
- time spent maintaining each write-up.

## New write-up checklist

1. Add the route to `raceWriteups.ts` with its path, labels and editorial
   `reviewedAt` date.
2. Add it to the SEO invariant fixtures and signed-out smoke coverage.
3. Use `getRaceWriteupPhase()` with the loader's server timestamp.
4. Render `RaceWriteupPhaseLabel`, `RaceWriteupActions` and the shared weekend
   schedule.
5. Put weather, weekend news and other expiring sections behind
   `isRaceWriteupLive()`.
6. Pass cancellation state into SportsEvent structured data.
7. Verify the preview, evidence, race-picks, picks-locked, finished and
   cancelled states.
8. Run typecheck, focused tests, SEO invariants, copy audit and accessibility
   smoke coverage.
