# Grand Prix Picks for TRMNL: Product Specification

**Status:** Built and installed as a private plugin on Barry's device (22
September 2026); not yet submitted as a Recipe (section 9). The polling
endpoint is `apps/web/server/routes/api/trmnl/weekend.get.ts` (logic in
`apps/web/server/lib/trmnl.ts`), and the Liquid plugin is `apps/trmnl/`.  
**Product type:** Public TRMNL Recipe. No sign-in, no per-player data.  
**Marketplace name:** Formula 1 Race Weekend, tagline "F1 weekend: times,
results, news". The name matches the four "Formula 1 …" plugins already
listed, so a search for "formula 1" puts it beside them, and "Race Weekend" is
the difference from all four; "F1" in the tagline catches the other search.
The brand is on every screen (the title bar, the QR code), so the name is
spent on being found.  
**Specification version:** 0.3  
**Prepared:** 9 September 2026, revised 22 September 2026  
**Parent product:** [Grand Prix Picks](https://grandprixpicks.com)

TRMNL is an e-ink display (7.5" 800x480 2-bit grayscale on the OG, 10.3"
1872x1404 4-bit on the X) that wakes on a timer, asks a server for a PNG,
renders it, and sleeps. This plugin puts the current Formula 1 race weekend on
that screen: session times, results as they are published, the confirmed
grid, and the news behind them.

Platform facts below were read from <https://docs.trmnl.com> and
<https://help.trmnl.com> on 9 and 22 September 2026 and are marked
**verified**.

## 1. Why this is worth building

**It is a referring domain.** Per `project_seo_f1_standings` the bottleneck is
authority, not indexation, and the site has two referring domains. A listing in
the TRMNL marketplace is a third, on a relevant technical property, plus
whatever their newsletter and Discord produce. TRMNL has also paid plugin
developers since November 2025 (creator fund).

**It is an acquisition path that asks nothing of the reader.** The plugin is an
F1 news screen and never mentions picks. A reader who wants more scans the QR
code and lands on the weekend's write-up or race page, where the site's own picks CTA does the
converting. The QR link is tagged for PostHog (section 7), so the path is
measurable.

## 2. What is already on the marketplace

Searching "formula 1" on trmnl.com/plugins returns nine results that are four
distinct plugins:

- Formula 1 Races (upcoming race at a glance)
- Formula 1 Driver Standings
- Formula 1 Constructor Standings
- Formula 1 Calendar & Race Times

Plus Formula 2, Formula 3 and Formula E calendars.

Every one of them renders data anybody can pull from Ergast or OpenF1, as a
table, and **every one of them is equally true on Tuesday and on Sunday
night**. None carries news, practice results or the starting grid, and none
changes across a weekend. That is the gap this plugin occupies.

## 3. Platform constraints

### Verified

| Constraint                                   | Detail                                                                                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render model                                 | Device requests content on a timer; TRMNL's server generates a PNG. The device never receives a push.                                                                                                                                         |
| Plugins are **pull, not push**               | TRMNL polls us. We cannot initiate.                                                                                                                                                                                                           |
| A Recipe's markup lives **inside TRMNL**     | A Recipe is a private plugin with the Polling strategy, approved for listing: our URL returns JSON, and Liquid templates stored in TRMNL render it.                                                                                           |
| Changes propagate                            | Editing the Recipe's markup updates every install.                                                                                                                                                                                            |
| All four layouts are **required to publish** | `full`, `half_horizontal`, `half_vertical`, `quadrant`.                                                                                                                                                                                       |
| Polling URL interpolation                    | `trmnl.user.time_zone_iana` and `trmnl.user.locale` interpolate into the polling URL, so one endpoint serves every zone.                                                                                                                      |
| **On-demand refresh** (since May 2026)       | TRMNL polls just before the device draws. The plugin's refresh setting is now a floor: 15 minutes by default, 5 on TRMNL+.                                                                                                                    |
| Unchanged data means **no redraw**           | If the polled payload matches the last one, no new screen is generated. A wake without a redraw costs about 20% of one with.                                                                                                                  |
| Built-in `qr_code` Liquid filter             | Renders a scannable SVG in the markup. No image hosting needed.                                                                                                                                                                               |
| `TRMNL_SKIP_DISPLAY` is not for Recipes      | TRMNL asks published Recipes not to hide themselves from a playlist; owners get no indication why.                                                                                                                                            |
| Publishing is a manual review                | A Recipe is submitted from the plugin's settings page; Chef lints it and TRMNL's team reviews it, looking for "focus, not distraction" (section 9). Emailing team@trmnl.com with an install video is the route for OAuth Third Party plugins. |
| No content retention                         | TRMNL stores only the most recent rendered screen per plugin.                                                                                                                                                                                 |

### What they mean for the design

1. **A screen must stay true for as long as it sits on the device, and we
   never learn how long that is.** Data is fresh when drawn, but the image
   stays up until the next wake, an hour or more on a battery-friendly
   playlist. So session times are local clock times ("Qualifying Sat 16:00"),
   never countdowns, and nothing in the payload moves with the clock except at
   a real boundary (a session starts, a result lands). A ticking field would
   redraw on every poll for no gain. Computing "time until" in Liquid is worse:
   when the payload is unchanged TRMNL skips the render, so the countdown
   freezes. The same design serves a 5-minute TRMNL+ device; it just sees each
   boundary sooner.
2. **The quadrant layout is the most used**, because it is the mashup slot. It
   gets one fact: the lead (section 4).
3. **The satori/OG pipeline in `apps/web/src/lib/og/` is not the rendering
   path.** TRMNL renders Liquid with its Framework CSS.

## 4. What each phase shows

**Every screen described here is rendered, live, at
[grandprixpicks.com/trmnl](https://grandprixpicks.com/trmnl)**, for each
sample moment of a weekend, at every size at once (section 8). That page is built from
the same Liquid files and payload builder the plugin uses, so when this
section and the page disagree, the page is right and this section is the bug.

The screen changes with the weekend. The phase is computed on every poll from
the race document and what has been published; nothing is scheduled.

| When                                | Lead (every layout)  | Full layout, right column |
| ----------------------------------- | -------------------- | ------------------------- |
| Before the race is next             | `<Session> <time>`   | Newer of news or result   |
| Race next or under way, no result   | `Lights out <time>`  | Grid if published         |
| Race result published, held for 36h | `Race winner <name>` | Race top 5                |
| No race left in the season          | The champion         | Both tables, the news     |

The weekend shown is the next race, except that a race holds the screen for
36 hours after lights out so a Sunday result is still up on Monday
(`selectTrmnlRace`). A cancelled round is skipped.

**The off-season** (no race left, and the result hold over) shows the season
just run: `standings` in the payload, built by `buildStandings` from
`f1Standings.getF1Championship`, and the site's race-independent news
(`globalNews.listRecent`). The title reads "Formula 1 2026 Standings" and "After
23 rounds"; before every round is scored (only the `/trmnl` page previews it
then) it keeps the title, reads "After round 16 of 23" and names the
"Championship leader" rather than a champion. Only when no round is scored
at all does the screen say "No race scheduled.".

- **Full:** all 22 drivers in two columns, all 11 constructors in a third,
  and one news item beside the QR code in the heading. In portrait the
  constructors follow the drivers.
- **Half horizontal:** the champion (a fitted value) and the constructors'
  champion, beside the drivers' top five. Two tables side by side wrapped
  every name and ran into the title bar.
- **Half vertical:** the title beside the QR code, then the drivers' top ten;
  the constructors' ten join them only on the tall portrait half.
- **Quadrant:** the title, then the champion and the constructors' champion
  beside the QR code.

**Race header:** the race flag beside the race name and weekend details. The
full landscape layout combines circuit, round and dates on one line, with a
larger race name above it. Portrait full screens use smaller type and allow
the details to wrap beside the flag and QR. The smaller layouts keep those
details on two lines. The flag follows race identity (`raceCountries.ts`) and
the circuit follows the venue
(`circuits.ts`), so the 2026 Bahrain round flies Bahrain's flag over "Sepang
International Circuit". Circuit facts beyond the name (length, laps) are not
in the repo and are not shown.

Nothing is clamped: an ellipsis once cut the dates off. The dates never split
("1 – 3 May"): their spaces become
non-breaking in the template, because the Framework's label is a flex container
that swallowed the space before a nested no-wrap span.

The circuit and round text is black: gray small labels were too faint to
read on the X. In the full layout it is `label--base` on OG and
`label--xlarge` on X beneath a larger title. The other layouts keep their
smaller type.

Every flag in a layout stands the same height, matched to the text
beside it on each device: on the OG 56px, or 36px on the half-horizontal,
whose 200px-high slot overflowed at 48px; on
the X 96px on the full layout, 88px on the half-vertical and 68px on the
half-horizontal and quarter. Its width follows the flag's own shape: Monaco
is 5:4, Italy 3:2, the US 1.9:1. A fixed 3:2 box letterboxed the others inside
their frame, so the frames looked different sizes. The width is capped for
Qatar, whose file's viewBox is 75:18 and stretches to fit. On the X the cap
uses the named scale (`lg:w--max-48` is 192px): the Framework generates
bracketed sizes only up to `[128px]`, a larger one silently does nothing, and
that squeezed every X flag into the OG's 112px cap. A render test now rejects
any bracketed size over 128px in the templates. The flag is `shrink-0`, and
in the half-horizontal the header and QR code are `flex-none`:
`layout--stretch` gives every child of the row an equal third, which left the
header too narrow for a wide flag. A 2px black frame surrounds
the image, so white fields (Japan, Monaco, Poland) keep an edge against
the white screen. In 2-bit grayscale most flags stay recognisable, but
tricolours that differ only by hue (Italy, Mexico, Ireland) come out alike, so
the flag is never the only thing naming the race.
The flag is two images of the same file, one per device (`lg:hidden` /
`hidden lg:block`). The OG's is marked `image-dither`, so TRMNL dithers it to
the OG's few inks. The X's is a plain `image`: its 16-gray panel draws flat
grays, and dithering made small emblems and flat stripes look noisy. There is
no Framework class for "don't dither", so no mark is the whole instruction; an
invented class for it (`image-gray-x`) was removed on 23 September 2026
because TRMNL would have ignored it.

The lead is a session name in title weight over the value in large type
("Free Practice 3" / "Sat 11:30"). The name was grey label text at first, which
left a big time with nothing saying what it was for.

**Session names** are spelled out where there is room ("Free Practice 1",
"Sprint Qualifying"): the full layout's timeline and the lead. The half-vertical
timeline uses the short form ("FP1", "SQ"). "Free Practice" is this surface's
wording; the rest of the site says "Practice 1".

**Weather is per session.** Each timeline row carries its own forecast: one of
TRMNL's weather icons, the temperature, and the chance of rain when it is 20%
or more (the race pages' cut-off). It comes from the same per-session window
the race pages use (`buildWeatherSessions` and `summarizeSessionWindow` in
`weatherPresentation.ts`). A stale forecast shows nothing anywhere, and a
session beyond the forecast window shows nothing on its row. Icons are TRMNL's
own set at `trmnl.com/images/plugins/weather/` (Erik Flowers' Weather Icons,
served with open CORS), mapped from MET Norway codes by `weatherIconUrl`. Day
or night comes from the session's local start at the track (18:00 or later is
night), never from the code's `_night` suffix: beyond a couple of days MET
forecasts in 6-hour periods, and a 16:00 race in Baku drew a moon.

**Full:** the race header and QR code across the top. Left column: the lead and the
weekend timeline (sessions with local times, weather, each one's top three,
and a filled "Next" marker on the first session that has not started). Right
column: the grid on race morning, otherwise whichever is newer of the latest
session result ("Race result", "Qualifying result") and up to twenty headline
candidates. When more than six arrive, headline type steps down once; TRMNL
overflow hides trailing items that do not fit. A horizontal divider separates
each adjacent headline.
The focus block owns the column's spare
height: TRMNL's overflow script hides news items that do not fit, and a
separate spacer read to it as content and hid most of them. When headlines fit,
the list is centred vertically in the column. On race morning
the grid fills the right column while the QR code stays in the header.
When there is no news to show, a short empty message is centred in the right
column.

**Half horizontal:** the compact race header and QR code sit above the lead
and its weather. Beside them, it shows the latest result or, before results,
the short weekend schedule followed by as many headlines as fit.

**Half vertical:** the compact race header and QR code sit above the lead and
its weather. Before results, it shows the first four upcoming sessions and
up to seven headlines after the timeline, with dividers between headlines.

**Quadrant:** the compact race header and QR code sit above the lead and its
weather. The lead stays primary; up to two headlines sit below it when there is
room. TRMNL's overflow manager hides a headline if it does not fit, and a
divider separates two visible items. Like every layout, its title bar reads
"GrandPrixPicks.com".

**The lead's weather** is the lead session's own forecast (`lead.weather`),
under the lead on every layout, worded as the race pages word it
(`sessionWeatherLine`: "Partly cloudy · 27°C", "Rain · 23°C · 60%") beside
its icon. An icon and a temperature alone read as an orphan. Timeline rows
keep the compact form (icon, "23°", "60%").

**Results** carry the top ten for a race or sprint and the top five for a
qualifying session (`RESULT_ROWS`). The full layout and the half-vertical show
ten as two columns of five; the half-horizontal shows five. The columns are
split by hand, although TRMNL's rules ask for their overflow engine (one
`.column` with `data-overflow-max-cols`). Tried on 23 September 2026, the engine
filled the first column before starting the second: ten rows came out 7 + 3
on the OG and 9 + 1 on the X, and a portrait X clipped the list after eight.

**Long values fit by width only.** TRMNL's guide says a text value also needs
`data-value-fit-max-height`, but their script says the opposite: without it
fitting is width-only, and a height check wrongly shrinks text to the minimum
size. So the lead has none.

**Long values fit.** The lead value carries `data-value-fit="true"` (an
earlier `data-fit-value` was the wrong name and did nothing), and its wrapper
is `w--full`: TRMNL's fitting shrinks a value to its parent's width, and in a
centred flex column that parent was exactly as wide as the text, so "Kimi
Antonelli" ran under the QR code.

A practice row stops saying "Awaiting result" six hours after the session, so a
failed OpenF1 poll cannot leave it up until Monday.

## 5. Data

All public Convex queries, called from the Nitro route:

| Block             | Query                                                 |
| ----------------- | ----------------------------------------------------- |
| Weekend selection | `races.listCurrentSeason`                             |
| News and grid     | `raceNews.list`                                       |
| Session results   | `results.getEnrichedTop5BySessionForRaceSlug`         |
| Practice          | `practiceResults.getPracticeSessionSummariesForRace`  |
| Weather           | `weather.getByRaceSlug` (dropped when stale)          |
| Off-season tables | `f1Standings.getF1Championship` (the season just run) |
| Off-season news   | `globalNews.listRecent`                               |

Notes on news:

- `raceNews.list` returns the write-up selection for the round being shown,
  so a story published early for a later round never reaches this weekend's
  screen. **Go through it**, never a raw table read.
- The starting grid is researched as a news item each weekend and carried on
  that item as structured data (`startingGrid`, resolved to names by
  `raceNews.list`). The race-morning grid needs no pipeline of its own.
- News headlines stand alone on the display. The linked race write-up carries
  source attribution for its stories.

## 6. Layout and design

**TRMNL's Framework classes, no CSS of our own.** Recipe markup lives in
TRMNL, and their publishing linter (Chef) flags inline `padding`, `margin`,
`color`, `font-size`, `display` and similar. Only the 2-bit-safe shades
(`black`, `white`, `gray-30`, `gray-55`) are used, and the icon is a black
mark on transparent, because the site favicon's chartreuse bars vanish in
grayscale. It is inline in the `title_bar` template, base64-encoded with
`base64_encode`, as TRMNL's guide asks, so drawing a screen never fetches it.
`apps/web/public/trmnl-icon.svg` is the same mark as a file, for the directory
listing. The flag's frame is a black box with 2px of padding
(`bg--black p--0.5`) rather than an inline border: TRMNL's rules allow no
inline styles, and the Framework has no all-sides border class.

Timing Sheet Minimal (`project_timing_sheet_minimal`) suits e-ink as it is:
flat, shadowless, no livery colour. Every livery-coloured competitor turns to
grey mush on the device.

## 7. QR code and tracking

Every layout carries the QR code without a caption. The title bar reads
"GrandPrixPicks.com" (display casing, per
`feedback_brand_url_casing`), so the address is on screen without repeating it
under the code.

The code encodes a short link, `grandprixpicks.com/t/<race>/<phase>` (phase
`b`, `w` or `r`). A QR code grows with its payload: the full destination with
four UTM parameters is about 140 characters and drew a 147px code that pushed
the grid heading off the screen, while the short link draws 87px at 3px per
module (about 0.6mm on the OG, comfortably scannable). Error correction is
level M; TRMNL's filter defaults to H, which is for printed codes that get
scuffed.

The off-season code is `grandprixpicks.com/t/standings`, which lands on
`/f1-standings` with `utm_content=off_season`.

`server/routes/t/[...path].get.ts` expands it with `resolveTrmnlLanding`: the
weekend's write-up when one exists (`getRaceWriteup` in
`apps/web/src/lib/raceWriteups.ts`, the registry the footer and race page
already use), because that is the fuller read, otherwise `/races/<slug>`. Both
carry the site's picks CTA. The redirect adds:

| Parameter      | Value                             |
| -------------- | --------------------------------- |
| `utm_source`   | `trmnl`                           |
| `utm_medium`   | `qr`                              |
| `utm_campaign` | `trmnl_plugin`                    |
| `utm_content`  | `build_up`, `weekend` or `result` |

`utm_content` is the phase the screen was in when scanned. The path is
typeable, so the slug is matched against a strict pattern, an unknown phase is
dropped rather than repeated into analytics, and anything unrecognisable goes
to the home page, still attributed. The redirect is a 302, like the other
short links in `server/lib/socialRedirect.ts`. `pageViewProperties` in
`apps/web/src/lib/analytics.ts` sends `utm_content` with the other three.

## 8. Code

- `apps/web/server/routes/api/trmnl/weekend.get.ts`: the polling endpoint,
  `GET /api/trmnl/weekend?tz=<IANA>&locale=<lang>`. Public, cached 60s per
  zone and language, answers 503 on failure so TRMNL keeps the last good
  screen. A missing zone falls back to UTC and says so on screen; invalid or
  unexpected query parameters return 400 before any Convex reads.

The production Cloudflare zone has a cache rule for this GET path, ordered
after the signed-in bypass rule. It respects the endpoint's 60-second edge and
browser TTLs; verify with two identical requests and `cf-cache-status: HIT` on
the second. A rate limiting rule blocks non-TRMNL sources after 20 requests
in 10 seconds per IP, for 10 seconds. A path-scoped custom rule skips only
rate limiting for TRMNL's published IPv4 and IPv6 servers. Compare that rule
with <https://trmnl.com/api/ips> whenever polling fails or TRMNL changes its
server addresses. This is abuse protection for a public Recipe feed, not an
authentication mechanism for a future paid API.

- `apps/web/server/routes/t/[...path].get.ts`: the QR code's short link.
- `apps/web/src/lib/trmnl/payload.ts`: weekend selection, phase, formatting,
  QR landing. Pure and tested (`payload.test.ts`), including the rule that two
  polls in the same phase give an identical payload. It lives under `src/`
  rather than `server/` because the `/trmnl` page runs it too.
- `apps/trmnl/`: the plugin in `trmnlp`'s project layout (`src/settings.yml`,
  four layouts, `shared.liquid`). `trmnlp` needs Ruby 4 or Docker. To import
  by hand, zip the flat files in `src/`.

### The screens page: `/trmnl`

`apps/web/src/routes/trmnl.tsx` shows every screen, for each sample moment of
a weekend, with all four sizes side by side, on any screen, with the payload
behind it. Three switches pick the screen: the device (`?device=og|x`), the
orientation (`?orientation=landscape|portrait`) and the palette (`?palette=`,
one of `1bit`, `2bit`, `4bit`, `color-4bwry`, `color-7a`, `color-full`; the
default is each device's own, 2-bit on the OG and 4-bit on the X). A fourth,
`?news=`, shows any moment with 0, 1, 2 or 20 sample headlines instead of the
news as published (`sampleNewsVariant` in `scenarios.ts`; the server builds
each moment's variants, since news can change the focus block too). The
payload carries at most twenty headlines, so 20 shows the overflow as a device
would. There was a size switch as well; showing every size at once replaced
it. It is the place to check
a layout change, and the plugin's "learn more" link from the TRMNL directory.

- **The screens are the site's real weekends.** Each moment (build-up,
  Friday, Saturday, race morning, finished, sprint) shows the next race if that
  moment has already come for it, otherwise the latest weekend it has come
  for, replayed as it stood then: so on a Tuesday the build-up is this
  weekend's, live, and the rest are last weekend's until this one reaches
  them. `pickReplay` and `replayWeekend` in `apps/web/src/lib/trmnl/replay.ts`
  do the choosing and the replaying (a replay hides results, practice and news
  published after its moment; results are taken to land a fixed lag after
  their session starts). Moments are defined against each race's own schedule
  (`momentAt`: Friday is three hours after the last Friday session, and so on).
- **Data** comes from `loadTrmnlWeekend` (`weekendData.ts`), the same loader
  the polling endpoint uses, so the page cannot fetch differently from the
  device. A replay of a finished weekend reads the write-up forecast
  (`weather.getForWriteup`), which outlives the weekend; the live one goes
  quiet once the race is over.
- **Loading** is a server function, `fetchTrmnlPageScenarios`
  (`pageScenarios.ts`), called from the route loader. Loaders are not
  code-split, so importing the builder there would put it on every page; the
  client sees only a stub. The page caches for a minute at the edge
  (`setRaceDataCacheHeaders`), because the build-up tab is live.
- **The off-season tab** shows this season's real standings as they stand,
  so it reads "Championship leader" until the finale, with sample news
  (`SAMPLE_OFF_SEASON_NEWS`): off-season news is months away.
- **Samples** (`TRMNL_SCENARIOS` in `scenarios.ts`) remain for any moment no
  weekend has reached yet (the sprint before the first
  sprint weekend), and for the render and parity tests. Sample news uses
  invented headlines, and the page says when it is showing a sample. The news
  switch covers the empty state and overflow for every moment; the full
  layout offers up to twenty headlines at once and keeps the QR code in the
  header above them; overflow determines how many fit.
- **Feedback** (`routes/-trmnl/TrmnlFeedback.tsx`) sits under the screens:
  one box, sent through `support.submitRequest` with category `trmnl`, so it
  reaches the support inbox. Sending needs an account, deliberately: someone
  who found the plugin in TRMNL's directory has never seen the site, and this
  is their reason to sign up. A signed-out visitor writes first, presses
  "Sign in and send", and the message goes once sign-in completes; the route
  stays Clerk-free because sign-in goes through `requestSignIn`.
- **No jank between tabs.** Each screen is double-buffered: a new screen is
  drawn in a hidden frame and replaces the old one once TRMNL's script has
  fitted it, so a tab change never flashes white or jumps. The caption
  reserves two lines. A sweep of every tab on both devices measured a total
  layout shift of about 0.005.
- **A switch takes about a quarter of a second.** It took two to seven. The
  frames are sandboxed without `allow-same-origin`, so TRMNL's script never
  runs with this site's cookies, and Chrome gives each such frame a cache of
  its own: a document per screen re-fetched and re-parsed the Framework's 18MB
  stylesheet every time. So each `TrmnlScreen` keeps two frames that load
  `TRMNL_PREVIEW_SHELL` once and are then sent screens by `postMessage`; the
  shell swaps its body, re-runs the Framework's `terminalize()` and reports
  back. The hidden frame sits under a white cover, never at zero opacity:
  Chrome throttles animation frames in a cross-origin frame it takes to be
  invisible, and `terminalize()` waits on them, which alone cost four seconds
  a switch. A covered frame is not throttled. A spinner shows after
  400ms of waiting, which in practice is a frame's first boot.
- **Screens** are `trmnlScreenProfile` in `render.ts`, which turns the three
  switches into the Framework's own device classes (`TRMNL_PALETTES` lists
  the palettes). The OG in 2-bit is `screen--ogv2 screen--md screen--2bit`,
  800x480; in any other palette it is `screen--og screen--md` plus that
  palette's class (`screen--1bit`, `screen--color-4bwry` and so on). Portrait
  adds `screen--portrait` and swaps the dimensions.
  The X is `screen--v2 screen--lg screen--density-2x screen--4bit`: it lays out
  at 1040x780 CSS pixels and the Framework scales the whole screen by its 1.8
  pixel ratio to the panel's 1872x1404, so the frame has to be 1872x1404 or
  only its top-left shows. Its 2x density swaps TRMNL's pixel fonts for Inter.
  Before these classes were set the page rendered the Framework's default
  screen, which is 1-bit and neither device. Larger sizes on the X come from
  `lg:` prefixes in the templates (`lg:title--large`, `lg:table--large` and
  so on), which leave the OG untouched.
- **Rendering** is `apps/web/src/lib/trmnl/render.ts`: the real `.liquid` files
  (imported raw), rendered with liquidjs, plus shims for TRMNL's two
  extensions (`{% template %}` and `qr_code`). Half and quarter layouts are
  shown inside their mashup beside "Another plugin" slots, with TRMNL's
  Framework CSS and JS loaded from trmnl.com in a sandboxed iframe.
- **Palettes include the platform's image treatment.** `image-dither` only
  marks an image: TRMNL's renderer dithers it to the device's inks, and the
  Framework CSS and JS do not, so the OG flags showed in full colour on every
  palette. The preview document runs `DITHER_SOURCE` (Floyd-Steinberg to the
  palette's nearest ink, at the image's size in panel pixels; none on full
  colour). An image without `image-dither` (the X's flag) is only snapped to
  the nearest gray, with no diffusion, on grayscale palettes.
  The sandboxed frame cannot read pixels from another origin, so
  `TrmnlScreen` inlines the flag as a `data:` URI first and holds the screen
  back until it has.
- **Parity:** on 22 September 2026 all 28 renders (7 scenarios x 4 layouts;
  the device changes only the screen class around them) were compared with TRMNL's own Ruby renderer (the `trmnl-liquid` gem, strict
  mode) and were identical once the QR SVG was set aside. liquidjs is still a
  different engine, so the device is the final check.
- **Tests:** `render.test.ts` renders every scenario at every size and fails on
  an unrendered tag, a missing lead, a QR code where there should not be one,
  or `0`/`undefined`/`null` inside a class attribute.
- **ICU spacing:** dates are formatted with plain spaces (`plainSpaces` in
  `payload.ts`). ICU inserts thin and narrow no-break spaces ("4 – 6 Sept",
  "10:00 AM") and which ones varies by version: Node and Chrome disagreed,
  which broke hydration on this page, and a glyph the device font lacks would
  draw as a box on e-ink. The payload JSON on the page renders client-only for
  the same reason.
- **Engine gap found:** liquidjs resolves a variable a `{% render %}` did not
  pass (`size`) to `0`, where TRMNL's Ruby Liquid falls back to the default.
  The page showed `class="title 0"` headlines the device would never have
  drawn. Blocks now take every variable explicitly (`headline_size`), and the
  class-attribute check above catches the next one.
- **Bundle:** `validateSearch` and `head` ship in the site's main bundle, so
  they must not import the renderer or the scenarios. When they did, liquidjs
  and the templates added about 125 kB to every page. The component is split
  into its own chunk (about 32 kB brotli), loaded only on `/trmnl`.
- **SEO:** `noindex` and not in the sitemap: it is mostly rendered screens with
  little prose, per `docs/seo-content-policy.md`.

## 9. Installing and publishing

Read from TRMNL's help centre ("Plugin recipes", "Demo data for publishing
plugins", "Importing and exporting private plugins") and its review team's
checklist, "A Checklist for Turning a Private Plugin into a Recipe for Others"
(trmnl.com blog, 27 April 2026), on 22 September 2026. Their UI moves, so
check before relying on a button's name or place.

### How the plugin is installed today

Barry's device runs it as a private plugin, "Grand Prix Picks"
(`trmnl.com/plugin_settings/485545`), set up by hand on 22 September 2026:

1. Plugins → Private Plugin → **Add new**. Name "Grand Prix Picks", strategy
   Polling, verb GET, no headers, polling URL:
   `https://grandprixpicks.com/api/trmnl/weekend?tz={{ trmnl.user.time_zone_iana }}&locale={{ trmnl.user.locale }}`.
   Save. Max refresh rate: every 15 minutes (the fastest without TRMNL+).
2. **Edit Markup**: each tab gets its file from `apps/trmnl/src`: Full,
   Half horizontal, Half vertical, Quadrant, and Shared (`shared.liquid`,
   without which every layout fails). Each tab saves on its own.

Things that cost time the first time:

- **Import new** (zip import) appears only on the private plugin list, and
  that list redirects to the "new plugin" form while the account has no
  private plugins. The first one has to be made by hand; import is available
  after that.
- A new plugin shows "No race scheduled." until its first poll after the
  markup is saved. TRMNL enforces the plugin's minimum refresh interval even
  on **Force Refresh**, so the first real screen can be up to 15 minutes
  away.
- To debug: **Parse** under the polling URL shows the URL with the owner's
  zone and language filled in; the plugin's **Timeline** says when it will
  refresh next and why it skipped; the device's **Logs** show each poll and
  any Liquid error. "Your variables" in the markup editor lists only
  `trmnl` until a poll has succeeded with markup in place.

To change the plugin: edit `apps/trmnl/src`, check it on `/trmnl`, commit,
then copy the changed files into TRMNL's editor. Nothing syncs the repo to
TRMNL. `trmnlp push` can (Ruby 4 or Docker, and a TRMNL API key).

### Publishing it as a Recipe

A Recipe is a private plugin TRMNL has approved for its directory
(trmnl.com/recipes). Owners **Install** it, which pulls in every later change
the author makes, or **Fork** it into an editable copy that no longer
updates. Forking needs the Developer add-on.

**Before submitting.** TRMNL's reviewers work through a checklist. Three
items on it were not met at first, and were fixed on 23 September 2026:

1. **Portrait.** They preview every layout on the OG and the X in landscape,
   and on the X in portrait, looking for whitespace and content cut off.
   `/trmnl` has an orientation switch (`screen--portrait`; the X is
   1404x1872, the OG 480x800). The
   full layout's two columns are a grid that stacks in portrait
   (`grid--cols-2 portrait:grid--cols-1`): side by side they wrapped every name
   and time and left half the screen empty. The half-vertical shows one column
   of ten results in portrait instead of two of five (`portrait:hidden` /
   `hidden portrait:block`), and the race-morning grid drops to its smallest
   rows on a portrait X (`lg:portrait:table--small`), where the base size
   pushed P8 onwards off the screen. The half-horizontal's three columns
   become two rows in portrait (`portrait:layout--col`): the header and lead
   beside the QR code, then the news or result full width, because at 480px
   three columns truncated every headline and clipped the winner's name. The
   quarter puts its QR code under the lead in portrait (`portrait:flex--col`). The grid children are plain flex
   columns: the Framework's `column` class is positioned by the `columns`
   engine and clipped its content inside a grid.
2. **Gray labels on 1-bit screens.** They flag `label--gray` as hard to read on
   an OG set to the 1-bit palette. Labels are black by default and gray only
   on palettes with real gray ink (`2bit:label--gray 4bit:label--gray`): a
   1-bit screen dithers gray text into speckle, and so does every colour
   palette, which has no gray and no Framework prefix to override it with.
   `/trmnl`'s palette switch shows all six.
3. **A way to contact the author.** `author_bio` in `settings.yml` now has
   `email_address` (barry@barrymichaeldoyle.com, a placeholder until Barry
   picks the address to list).

Also check:

- **Inline styles.** Chef, TRMNL's automated linter, flags inline `display`,
  `padding`, `margin`, `background-color`, `color`, `border-radius`,
  `text-align`, `object-fit` and `font-size`. The templates use only `border`
  (the flag frame) and `white-space`, which are not on that list, but a
  reviewer may still comment.
- **The Description field** on the plugin's settings page is the tagline in
  search results, capped at 35 characters. It is set: "F1 weekend: times,
  results, news" (the first draft, "F1 race weekend: times, results, news",
  was 37).
- **The icon.** The plugin's settings take a PNG or SVG, 512x512
  recommended. `apps/web/public/trmnl-icon.svg` is the mark to use.
- **Form fields.** A plugin set up by hand has no `author_bio`. Paste the
  `custom_fields` block from `settings.yml` into the plugin's Form Fields
  box, then check its text and links render.

**The Recipe Master is the showcase.** On publishing, the plugin becomes the
"Recipe Master": every edit to it goes straight to every install, and its
latest full-screen render is the directory's preview image. So:

- Keep the Master as the demo. Install the published Recipe again for
  Barry's own device, and test changes on a copy (the clone icon) before
  editing the Master.
- Pick the preview with **Featured Image** in the Recipe's settings, on a
  weekend when the screen is at its best (race morning with the grid, or a
  finished race). Taking the Master off every playlist freezes its screen.
  The plugin shows only public data, so there is nothing personal to leak.

**Submitting.**

1. On the plugin's settings page, use the publish option beside
   "Publish plugin?". Chef runs first; fix what it reports.
2. Choose **Public** (reviewed, listed in the directory and promoted by
   TRMNL) or **Unlisted** (no review, a shareable link straight away, not
   searchable). Unlisted is a good way to give a few testers a link that
   still receives updates, before going public.
3. TRMNL's team reviews a Public submission, usually within a day or two, and
   sends feedback if changes are needed. A plugin in review can be taken back
   to private and edited.
4. They ask how the plugin helps other owners and how the author will promote
   TRMNL. The answer: the only F1 plugin that follows the weekend as it
   happens (section 2), with no live timing, so it keeps to their "focus, not
   distraction" rule; promoted in r/GPPicks and on X around race weekends.

**After it is published.**

- A published Recipe cannot be deleted or unlisted without TRMNL's help,
  and every change reaches every install at once. Change the Master
  carefully, and keep the payload backward compatible: the Liquid always
  reads the endpoint's current shape, so a renamed field breaks every
  screen at the next poll. `v` in the payload exists for this.
- Link to the listing from `/trmnl`: an install button above the screens.
- TRMNL pays Recipe authors through its creator fund (since November 2025).

## 10. Copy rules for this surface

`docs/product-voice.md` governs, as everywhere. Things this surface makes
sharper:

- The screen is glanceable and cannot be scrolled or tapped. One fact per
  block, and nothing that does not change what the reader knows.
- It reports the weekend. It never mentions picks, and news never tells the
  reader how to weight a Top 5 (`feedback_writeups_report_dont_instruct`).
- No em dashes (`feedback_no_em_dashes`). A URL on screen is dead text; the QR
  code is the one way off the screen.

## 11. Open

- Whether a Liquid template sees `trmnl.system.timestamp_utc` change when the
  payload is otherwise unchanged. Irrelevant while all time logic stays on the
  server; recorded so nobody moves it into Liquid.
- Temperature is always Celsius. A units form field would fix it for US
  owners.
- Screens have been rendered with TRMNL's Liquid library and Framework CSS in
  a browser and in TRMNL's own editor, but not yet seen on a device with data.
- Remote `<img>` in markup appears to load at render time (TRMNL's own starter
  template does it for the title bar icon), but that is not documented for
  polled Recipes.

## 12. Deliberately not doing

Recorded so these are not re-litigated.

- **Anything per player.** No sign-in, no key field, no OAuth: no pick
  deadlines, scores, leagues or season form on the screen. The plugin is a
  public F1 screen, and the site converts.
- **Pick-game content** (consensus, H2H community split). They only mean
  something to players.
- **Live data.** No timing tower, no live running order during practice,
  qualifying or the race. The cadence cannot support it, a stale order is worse
  than none, and TRMNL screens against distraction.
- **Driver and constructor standings.** Four plugins already do this. We would
  be the fifth table.
- **A push-driven plugin.** Not available for published plugins.
- **Rendering through satori.** Wrong contract. Section 3.
