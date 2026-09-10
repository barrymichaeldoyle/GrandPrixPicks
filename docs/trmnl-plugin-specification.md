# Grand Prix Picks for TRMNL: Product Specification

**Status:** Not started. No code in the tree. Build begins week of 14 September 2026.  
**Product type:** TRMNL e-ink plugin (Recipe, then optionally Third Party)  
**Working name:** Grand Prix Picks for TRMNL  
**Specification version:** 0.1  
**Prepared:** 9 September 2026  
**Parent product:** [Grand Prix Picks](https://grandprixpicks.com)

TRMNL is a 7.5" 1-bit e-ink display that wakes on a timer, asks a server for a
PNG, renders it, and sleeps. This document specifies a plugin that puts a Grand
Prix Picks weekend on that screen.

Platform facts below were read from <https://docs.trmnl.com> on 9 September
2026 and are marked **verified**. Everything not marked verified is a design
proposal or an open question.

## 1. Why this is worth building

Two reasons, in order of weight.

**It is a deadline that cannot be dismissed.** Per
`project_consensus_blocked_on_entrants`, 10 to 14 people pick a session and the
number has been flat all season. Every notification channel we have can be
swiped away. A panel on a desk cannot. A card reading "Quali locks in 4h, you
have picked 2 of 4" sitting in someone's peripheral vision all Friday is a
conversion mechanism, not a widget. This is the reason to build; everything
else is the reason people keep it installed.

**It is a referring domain.** Per `project_seo_f1_standings` the bottleneck is
authority, not indexation, and the site has two referring domains. A listing in
the TRMNL marketplace is a third, on a relevant technical property, plus
whatever their newsletter and Discord produce. TRMNL has also paid plugin
developers since November 2025 (creator fund).

## 2. What is already on the marketplace

Searching "formula 1" on trmnl.com/plugins returns nine results that are four
distinct plugins:

- Formula 1 Races (upcoming race at a glance)
- Formula 1 Driver Standings
- Formula 1 Constructor Standings
- Formula 1 Calendar & Race Times

Plus Formula 2, Formula 3 and Formula E calendars.

Every one of them renders public data anybody can pull from Ergast or OpenF1,
as a table, and **every one of them is equally true on Tuesday and on Sunday
night**. There is nothing personal, nothing time-aware, and nothing that
changes across a weekend on that entire page.

That is the gap this plugin occupies.

## 3. Platform constraints

These overturn several intuitions. Read them before designing anything.

### Verified

| Constraint                                   | Detail                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render model                                 | Device requests content on a timer; TRMNL's server generates a PNG. The device never receives a push.                                                                             |
| Marketplace plugins are **pull, not push**   | TRMNL POSTs to our `plugin_markup_url` every N minutes. We respond. We cannot initiate.                                                                                           |
| We return **HTML, not images**               | Response is JSON with `markup`, `markup_half_horizontal`, `markup_half_vertical`, `markup_quadrant`, `shared`. TRMNL rasterises it.                                               |
| All four layouts are **required to publish** | A public marketplace plugin must supply markup for every layout.                                                                                                                  |
| Webhook strategy is **private plugins only** | 12 payloads/hour (5 min), 30/hour on TRMNL+ (2 min).                                                                                                                              |
| Webhook payload size                         | 2kb, 5kb on TRMNL+. `deep_merge` and `stream` merge strategies exist for staying under it.                                                                                        |
| Request metadata                             | The POST body carries `user_uuid` and a `trmnl` object with the user's IANA timezone, locale, device dimensions and battery. Bearer token in the `authorization` header.          |
| Two marketplace lanes                        | **Recipe**: lives inside TRMNL, no OAuth, supports custom form fields, may call our services. **Third Party**: OAuth2 flow, we hold user PII and own the privacy obligation.      |
| Publishing is a manual review                | Email `team@trmnl.com` with plugin ID, a no-audio install video, and test credentials. They screen on ethos ("breeds distraction, not focus") and ask how you will promote TRMNL. |
| No content retention                         | TRMNL stores only the most recent rendered screen per plugin.                                                                                                                     |

### The three that change the design

1. **Push-on-event is unavailable for anything other people install.** A Convex
   cron POSTing the instant results publish works only for a private plugin on
   one desk. Do not design a published plugin around reactivity.
2. **The satori/OG pipeline in `apps/web/src/lib/og/` is not the rendering
   path.** We return markup and TRMNL rasterises. Our own HTML and CSS,
   rendered from Nitro. (Whether an `<img src>` inside returned markup is
   fetched at render time is an open question, see section 10.)
3. **The quadrant layout is the hardest and the most used**, because it is the
   mashup slot. It gets one number. Section 5 solves that with the state
   machine.

## 4. The organising idea: a weekend state machine

Every competing plugin renders a table that does not change across a week.
Ours renders **a different thing depending on where the weekend is**. The same
rectangle on the wall tells a story from Tuesday to Sunday night.

This is the feature. It is what makes the demo video, it is the argument for
public listing, and it is what makes the quadrant layout solvable, because the
phase decides which single number matters right now.

| Phase                                | Full screen leads with                         | Quadrant shows        |
| ------------------------------------ | ---------------------------------------------- | --------------------- |
| Tuesday to Thursday                  | Next race, weather, latest news item           | Days to lights out    |
| Friday to Saturday, picks incomplete | News filtered to unpicked sessions, lock clock | Time to next lock     |
| Friday to Saturday, picks complete   | Practice pace, news                            | Time to next lock     |
| Session locked, not running          | Your five against the consensus five           | Your divergence count |
| Race or sprint running               | Race pulse (section 5.6)                       | Your live points      |
| Session scored                       | Score out of 25, rank delta                    | Score out of 25       |
| Sunday night                         | Weekend total, league table                    | Season rank           |
| Off week                             | Season form, last five weekends                | Season rank           |

Phase is computed server-side from the race document, session lock times and
whether a live snapshot is active. Reuse `apps/web/src/lib/raceSessions.ts` and
`apps/backend/convex/lib/season.ts` rather than inventing a second clock.

Note the precedent in `project_results_first_window`: the dashboard leads with
the finished race for 8h after a race starts, and the boundary is client-side
because Convex queries do not re-run on elapsed time. The same problem applies
here and has the same shape, except that TRMNL re-requests on a timer, so the
phase can be evaluated fresh on every request. That is one thing this surface
gets for free that the web app does not.

## 5. Screen catalogue

### 5.1 Lock clock

The reason to build. Time to the next session lock as the largest object on
screen, plus completion state as four dots, filled per session picked.

Data: `races.getNextRace`, `races.getCurrentWeekend`, plus the viewer's picks
for the personal variant.

Guard: per `reference_preauth_weekend_capabilities`, `getCurrentWeekend`
answers once for a guest and every session reads `sign_in`-denied. Gate on
`weekendReflectsViewer` or the card will tell a signed-in user they have picked
nothing.

### 5.2 News

`raceNews.list` is a public query taking a `raceSlug`. Already suited to a small
screen:

- `headline` is written short
- `affectsSessions` says which session the item changes a pick for
- `driverCodes` is publisher-stated rather than parsed, so a badge is never
  wrong (see the Antonelli case in the schema comment)
- `sourceName` gives attribution without a link, which matters because e-ink
  has none
- the embargo field holds a card until its release time, so **go through
  `raceNews.list`**, never a raw table read

**Fuse news with the lock clock.** A news item is the reason to change a pick;
the countdown is the deadline. Separately they are two widgets. Together they
are one sentence, and no other plugin on that marketplace can produce it.
Filter `affectsSessions` against the sessions the viewer has not picked, so
only actionable items surface.

The 2kb webhook cap excludes `body` on the private-plugin path. Headline,
session tags and source name fit. On the markup path we control truncation, so
two lines of body are affordable.

Per `feedback_writeups_report_dont_instruct`, the card reports a fact. It never
tells the reader how to weight a Top 5.

### 5.3 Your five against the consensus

"Am I contrarian" is the most interesting question in a pick game, and it is
only answerable after lock, which is the gate `consensus.ts` already enforces
(`getSessionConsensus` returns null before lock, and when too few entered).

Two columns of five driver codes with the disagreements marked. Per
`project_player_consensus_content` this is the one fact only this site holds,
which makes it the strongest candidate for the public no-auth Recipe.

Data: `consensus.getWeekendConsensusForRaceSlug` (whole weekend, one round
trip, sessions absent rather than null until locked).

### 5.4 H2H duel strip

Eleven teammate pairs with the community split as horizontal bars. Two names
and a proportion is the best-suited shape that exists for 1-bit e-ink, and it
is entirely ours.

Lineups are round-scoped (`project_round_scoped_lineups`). Read the pairings
for the race's round, never `drivers.team`.

### 5.5 Post-session scorecard

Score out of 25, rank delta, best and worst pick. This is the emotional payload
of the game and it currently exists only inside the app.

### 5.6 Race pulse (not live timing)

`liveScoring.ts` is built and shipped: a self-rescheduling 15-second worker,
`liveSnapshots` in the schema, and `getActiveSnapshot` is already a **public**
query returning the running order plus the viewer's standing.

**TRMNL cannot show live timing and should not try.** Webhooks cap at one
update per five minutes, the device sleeps between requests, and an e-ink
refresh takes seconds. A timing tower five minutes stale is worse than none,
because somebody will trust it. There is also a screening risk: TRMNL asks
whether a plugin breeds distraction rather than focus, and
`docs/openf1-live-scoring.md` already made this call for the race page: no
timing tower, no telemetry, no track map.

So: three numbers, five-minute cadence.

```
LAP 34/57
You: 14 pts, 3rd of 22
VER NOR PIA RUS LEC
```

Carry the warning from `docs/openf1-live-scoring.md`: the live order includes
retired cars that will not be classified, so the number moves when official
results land. The copy must say the order is live and can change after the
flag. Never present a live total as a result.

**Coverage limit.** `liveSessionValidator` in `liveScoring.ts` is
`'sprint' | 'race'`. Quali and sprint quali have no live snapshot. Practice has
none at all: `practiceResults.ts` polls after a session ends. Extending live
scoring to qualifying is a backend project, not a plugin feature, because
OpenF1's `position` during an elimination session is a much messier signal than
it is in a race. Out of scope here.

### 5.7 Practice pace

Post-session, not live, and free today. FP results land an hour or so after
each session via `practiceResults.getPracticeSessionSummariesForRace` and
`getFp1ResultForRace`. Good Friday and Saturday filler that keeps the screen
worth looking at between locks.

### 5.8 League table

Six names with movement arrows. Structurally impossible for any competing
plugin, and it gives every league member a reason to install.

### 5.9 Season form

Last five weekend scores as bars. Cheap, and it fills the off-week dead air
that would otherwise get the plugin uninstalled between races. The webhook
`stream` merge strategy exists for exactly this shape if the private-plugin
path needs it.

### 5.10 Weather

`weather.getByRaceSlug` and `weather.getUpcoming` are public. Render
`WEATHER_ATTRIBUTION` wherever the forecast appears.

## 6. What the data layer already gives us

Verified public Convex queries, no auth required:

| Card               | Query                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| Next race, weekend | `races.getNextRace`, `races.getCurrentWeekend`, `races.getRaceBySlug`       |
| News               | `raceNews.list`                                                             |
| Consensus          | `consensus.getWeekendConsensusForRaceSlug`, `consensus.getSessionConsensus` |
| Race pulse         | `liveScoring.getActiveSnapshot`                                             |
| Practice           | `practiceResults.getPracticeSessionSummariesForRace`                        |
| Weather            | `weather.getByRaceSlug`                                                     |

**A fully public, no-auth Recipe can already render next race, weather, news,
consensus, practice pace and a race pulse without one new backend function.**
That makes tier 0 a genuinely complete plugin rather than a teaser, and it is
the single most useful finding in this document.

Personal cards (lock completion, scorecard, league, form) need a viewer, which
section 8 covers.

## 7. Layout and design

Four layouts, all required to publish: `full` (800x480), `half_horizontal`,
`half_vertical`, `quadrant`.

Timing Sheet Minimal (`project_timing_sheet_minimal`) ports to 1-bit almost
unchanged: flat, shadowless, sparse accent. The 3px team colour rule becomes a
3px black rule and still reads. Every livery-coloured competitor turns to grey
mush on e-ink. We would be the only F1 plugin in that directory that looks
built for the device.

Tokens are authored only in `packages/shared/src/tokens.ts`
(`project_design_system_source_of_truth`). A monochrome mapping for this surface
belongs there, not in the plugin.

TRMNL ships a Framework UI design system, recommended but not required. Decide
in week 1 whether to adopt their classes or ship our own CSS in the `shared`
node. Their in-browser markup editor has live refresh and is the fastest way to
iterate.

## 8. Auth, and the three tiers

**Tier 0, public Recipe, no auth.** Everything in section 6. Lives in the
marketplace, discoverable, backlink. This is the acquisition play.

**Tier 1, Recipe with a key field.** Recipes support a custom form builder and
may call our own services. A single "Grand Prix Picks key" text field pointed at
a token-scoped endpoint gets per-user data with **no OAuth, no PII custody and
no privacy obligation on our side**. This is the route to take. Mint the key in
Settings, scope it read-only, make it revocable.

**Tier 2, Third Party with OAuth2.** Only if tier 1 proves demand. Requires us
to act as an OAuth provider, which raises the question in section 10 about
Clerk.

### Build order

1. **Private plugin on Barry's desk.** Webhook strategy, Convex cron POSTs a
   2kb payload. Use TRMNL's markup editor with live refresh to design all four
   layouts against real data. Zero commitment, and it is the design harness.
2. **Promote the markup to a public Recipe** (tier 0). Ship, submit, get the
   listing.
3. **Add the key field** (tier 1) once the layouts are settled.
4. Tier 2 only on evidence.

### Suggested code locations

- `apps/web/server/routes/api/trmnl/markup.post.ts` for the pull endpoint
- `apps/web/server/routes/api/trmnl/` for the token-scoped viewer lookup
- `apps/backend/convex/trmnl.ts` for the webhook push used by the tier-0
  prototype only

## 9. Copy rules for this surface

`docs/product-voice.md` governs, as everywhere. Two things this surface makes
sharper:

- The screen is glanceable and cannot be scrolled or tapped. One fact, the
  action, and any detail that changes the action. Nothing else fits and nothing
  else belongs.
- No em dashes (`feedback_no_em_dashes`). No links, because e-ink has no links:
  a URL on screen is dead text, so name the source instead.

Check product vocabulary against the code before writing player-facing strings
(`feedback_no_legacy_terms_in_new_copy`).

## 10. Open questions

Resolve these in week 1, before layout work hardens.

1. **Can a Recipe's polling URL carry a secret from a custom form field?**
   Strongly implied by "optionally middleman with your own services" and the
   custom form builder, not stated outright. This decides whether tier 1 is
   cheap or whether personal data needs tier 2.
2. **Is an `<img src>` inside returned markup fetched at render time?** If yes,
   the OG pipeline comes back for one hero element.
3. **Can Clerk act as an OAuth provider?** Decides how painful tier 2 is. Only
   matters if tier 1 is blocked by question 1.
4. **Does TRMNL's Framework UI suit us, or do we ship our own CSS?**
5. **What refresh interval do we recommend?** Battery is the user's, and a
   5-minute cadence through a 2-hour race is a real cost. Consider recommending
   a slower default and letting race day be the exception.

## 11. Deliberately not doing

Recorded so these are not re-litigated.

- **A timing tower.** Section 5.6. The cadence cannot support it and TRMNL
  screens against it.
- **Live qualifying.** Needs live scoring extended past `sprint | race`, which
  is a backend project with a genuinely hard signal problem.
- **Driver and constructor standings.** Four plugins already do this. We would
  be the fifth table.
- **A push-driven published plugin.** Not available. Section 3.
- **Rendering through satori.** Wrong contract. Section 3.
- **A separate paid tier for faster refresh.** `docs/openf1-live-scoring.md`
  settled this for the live board at current scale and the same arithmetic
  applies: there are no paying subscribers to retain with a refresh perk.
