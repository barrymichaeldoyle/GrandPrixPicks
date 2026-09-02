# Creator poll (POC): Pre Race Chinwag

A one-page replacement for the Google Form Tommo McCluskey resets each race
weekend for his Pre Race Chinwag LIVE podcast, plus a results board he can put
on screen during the show.

Built as a one-off. If a second creator wants one, generalise then, not now.

## Status (2026-09-02)

**Built, merged to `main`, and unreachable in production.** Tommo has not been
contacted and nothing links to this from anywhere on the site.

|                          |                         |
| ------------------------ | ----------------------- |
| Vote page                | `/poc/chinwag`          |
| Results board (live)     | `/poc/chinwag/results`  |
| Results board (proposal) | `/poc/chinwag/demo`     |
| Link preview             | `/og/chinwag`           |
| Admin                    | `/admin` → Creator poll |

### To look at it in production

Set `CREATOR_POLL_PREVIEW_KEY` on the Cloudflare Pages deployment, then open the
pages with `?k=<that value>`. Until that variable exists the routes 404 for
everyone, including us — the gate fails closed, and the compiled bundle contains
no dev escape hatch (verified against `.output`, not assumed).

### Done

- Two-phase weekend: six questions before the race, the four Bangers & Clangers
  after it, with the post-race board pairing each answer against the pre-race one
  and settling pole and the winner against published results.
- Auto-advance off the race calendar (`advanceScheduledPolls`, every 15 minutes,
  opt-in per poll). Nothing in production has opted in.
- His artwork, his palette, his question order, his favicon, no Grand Prix Picks
  chrome.
- Type-to-filter picker with team colour, code, flag and team; accent-folding
  search; full combobox keyboard and ARIA. Axe clean.
- Link preview card in his palette that flips phase with the poll.
- Admin: pick race and phase, open/close, auto-advance, CSV export, clear votes.

### Open, in order

1. **Barry's call: send it.** Contact `me@tommccluskey.co.uk`, three lines, the
   vote link plus `/poc/chinwag/demo`, keep his form running.
2. **His artwork ships in `public/chinwag/`** and is therefore fetchable at
   `grandprixpicks.com/chinwag/*.webp` even while the pages 404. Unlinked and
   unindexed, but public. Fine for a proposal; delete if he says no.
3. **No Race Report header image.** His header reads YOUR 2026 RACE PREDICTIONS;
   the post-race phase reuses it. One image he would need to make.
4. **The embed route is untested on Safari.** `localStorage` in a cross-site
   iframe is blocked there, which weakens de-duplication. Not a problem for the
   link or CNAME routes. See Hosting.
5. **Both order lists are snapshots** and want editing when the grid changes,
   the same way his form does.

### Deliberately not built

Presenter mode (reveal one category at a time) and per-platform vote attribution
(`?from=yt`). Both good, both for after he says yes.

## What exists today

Form: `docs.google.com/forms/d/e/1FAIpQLSfMNiRhkIKXMqyUSfHNCQ2kqqJHlmVp3MX5LOUqiTHKrwb3dA`

Title: **YOUR 2026 PRE RACE PREDICTIONS**. Description: "For every race weekend
in 2026, this poll will be reset to give you lot a chance to predict the
weekend. There's 6 categories, and the results will tallied and used in my Pre
Race Chinwag LIVE podcast."

Six dropdowns, in order:

| #   | Question       | Options    |
| --- | -------------- | ---------- |
| 1   | POLE POSITION  | 22 drivers |
| 2   | RACE WINNER    | 22 drivers |
| 3   | BANGER DRIVER  | 22 drivers |
| 4   | CLANGER DRIVER | 22 drivers |
| 5   | BANGER TEAM    | 11 teams   |
| 6   | CLANGER TEAM   | 11 teams   |

No name or email field. Responses are private to him. Submitting requires a
Google account, though he never sees the address.

## What his version doesn't do

1. **He has to tally it.** Forms gives him a summary chart per question; getting
   "62% Verstappen for pole" onto a live show is a manual step every week.
2. **A Google account is a wall**, small but real, and it is the reason the
   response limit works at all.
3. **The driver list is hand-maintained.** It is still the pre-round-12 grid:
   Hadjar is on it, Tsunoda (in a Racing Bulls seat since the Dutch GP) is not.
   Ours is round-scoped and comes out of the same roster the game uses.

Point 1 is the pitch. Points 2 and 3 are supporting.

## What we build

### Branding: his, not ours

The page deliberately ignores Timing Sheet Minimal. It is built to sit on his
site, and a dark chartreuse-accented page reads as our product wearing his name.

The palette is sampled pixel-for-pixel from his form:

| Role                      | Value     |
| ------------------------- | --------- |
| Page                      | `#fdeded` |
| Card                      | `#ffffff` |
| Banner coral              | `#f78786` |
| Rule under the title card | `#f48888` |
| Submit                    | `#da3b3b` |
| Ink                       | `#303030` |
| Card hairline             | `#dadada` |

It lives as custom properties on one wrapper (`-components/ChinwagShell.tsx`),
scoped so nothing reaches the rest of the app. **Do not promote any of it into
`tokens.ts`.** A second creator is a second constant, not a second stylesheet.

Layout follows his form section for section: coral header banner, coral rule
under the title card, then one white card per question holding a plain label, a
category banner, and a `Choose` dropdown, with the crimson submit at the bottom
left.

### His artwork

The banners are **his own images**, pulled from the form and re-encoded to WebP
in `apps/web/public/chinwag/`: one header plus one per category, coral-and-white
duotone race photography with the category name burned in.

Approximating them was tried first, as flat coral bands with the heading set in
Archivo 900 and a white outline. It got the structure right and the feel wrong,
and the feel is the entire thing a creator judges this on. His artwork is most
of his brand; a lookalike is just a lookalike.

Two things follow from using the real files:

- The heading lives **inside** the image, so nothing is drawn over them and the
  page carries no display font at all. The `Chinwag Display` `@font-face` that
  the approximation needed is gone, and with it a 111 kB unsubset TTF.
- Each `<img>` takes the category name as its `alt`, because the words in the
  artwork are the heading and a screen reader would otherwise get nothing.

They ship with the POC so he sees his page rather than an impression of it. They
are his work: if he takes this on, he supplies the files and these are replaced.
If he says no, they come out.

**One gap left here.** His header artwork reads YOUR 2026 RACE PREDICTIONS, which
is the pre-race show. The post-race phase currently reuses it and lets the title
card carry the wording. A Race Report header is one image he would need to make.

### Two phases, because he runs two shows

He streams twice a round: a **Predictions** show before the race and a **Race
Report** after it, and both video descriptions carry the same line every week,
"plus Bangers & Clangers as per usual". His form only serves the first.

So the poll has a phase:

| Phase  | Asks     | Questions                     |
| ------ | -------- | ----------------------------- |
| `pre`  | who WILL | all six                       |
| `post` | who DID  | the four banger/clanger picks |

Pole and race winner are settled facts by the time the Race Report airs. Asking
a crowd to vote on a fact is the one thing that would make the page look stupid
on air, so `post` drops them and the board shows them as results instead, next
to what the crowd called.

The four overlapping questions are what make the post-race board worth having:
"before the race you said Alonso, afterwards you said Antonelli" is a segment,
and it is the thing a Google Form structurally cannot do.

### It resets itself

`autoAdvance` hands the poll to the race calendar. Every boundary comes from a
timestamp the race row already carries:

| When                            | Phase            | Voting |
| ------------------------------- | ---------------- | ------ |
| Until qualifying starts         | `pre`            | open   |
| Qualifying to the flag          | `pre`            | closed |
| Race finished                   | `post`           | open   |
| Five days before the next round | `pre`, next race | open   |

Predictions close at **qualifying**, not the race: the first thing the poll asks
about is pole, and leaving a pole vote open while qualifying is on television is
the detail that decides whether a creator trusts the tool.

A cron (`advanceScheduledPolls`, every 15 minutes) does the moving, and it
ignores any poll that has not opted in. Moving someone's poll under them without
being asked is worse than being late.

### Vote page

One screen, his dropdowns in his order, his wording (POLE POSITION, BANGER
DRIVER, and so on: his words, not ours). Submit, then the page shows the live
percentages. No account, no email, no name.

### Width

672px, against the 640px Google Forms gives him. Wider than his rather than
narrower (it started at 576px, which was the mistake): his artwork is the main
event and renders bigger here, and the picker rows carry a code, a flag, a name
and a team, which were tight at the old width. Past about 700px a column of
single-select rows stops reading as a form.

### The picker

His form uses a native `<select>` of 22 names. Ours is a type-to-filter combobox
(`-components/ChinwagCombobox.tsx`) showing, per row: a team-colour bar, the
three-letter code, the driver's flag, their name, and their team. Typing filters
on all three of name, code and team, so "nor", "ferr" and "mclaren" all get you
somewhere.

Two details that are not decoration:

- **Accents fold.** Typing `perez` finds Pérez and `hulkenberg` finds Hülkenberg.
  Two of the twenty-two carry a diacritic and both are names people type from
  memory rather than copy. Covered by `ChinwagCombobox.test.tsx`.
- **Codes match as a prefix, names as a substring.** Typing two letters narrows
  instead of surfacing every code containing them.

Built as a real `role="combobox"` with `aria-activedescendant`, arrow keys,
Enter to commit and Escape to revert, and the input falls back to the committed
label on blur so a half-typed query never survives as an answer.

**The artwork is the label.** His form sets the category above the image and
again inside it, and our first version added a third copy in the input's
`aria-label`. Now the banner is wrapped in a `<label for>`, its `alt` is that
label's text, and the control takes its accessible name from it. The
accessibility tree reads `combobox "POLE POSITION"`, once. Dropping the
redundant caption is also what lets the image sit flush at the top of the card.

Losing focus closes the list. That is the WAI-ARIA behaviour for Tab and it was
a real bug: the first version cleared the query on blur but not the open state,
so tabbing from one category to the next left every listbox behind it open. Six
popups could be on screen at once and `aria-expanded` claimed true on five
controls nobody was focused on. `ChinwagCombobox.open.test.tsx` covers it, and
fails without the fix.

Axe (WCAG 2.0/2.1 A and AA) reports no violations on the page, with the listbox
open or closed. It is not in the CI a11y suite: that suite runs against a
production build, where this route is behind a preview key.

What it costs is the phone's native select wheel, which some people prefer.
Options are kept at a 44px touch target and the list scrolls, so the fallback
behaviour is "scroll a list", which is what the native control was doing anyway.

### Order of the picker

**Copied from his form exactly**: grouped by constructor, each team led by its
senior driver, in his order. `CHINWAG_TEAM_ORDER` and `CHINWAG_DRIVER_ORDER` in
`creatorPolls.ts` hold it.

Worth knowing what that order is: the constructor sequence is the **2024**
championship (McLaren, Ferrari, Red Bull, Mercedes...), the season before last,
because the form was built once and never re-sorted. An earlier version of this
page ran the same _rule_ against the live championship instead, which is more
correct and was the wrong call: the point of the page is that a regular of his
cannot tell it apart from the form they already use, and a list in a different
order is the first thing they would notice.

**It degrades rather than drops.** His list is a snapshot and goes stale the way
his driver list does. A driver missing from it sorts after the listed ones inside
their own team, and a listed team always beats an unlisted one, so a mid-season
replacement stays in the picker beside their team-mate instead of falling off the
end of it.

That is not hypothetical — it is already load-bearing. His list has Hadjar in the
Red Bull seat and Lawson at Racing Bulls. Since the Dutch Grand Prix it has been
Lawson at Red Bull and Tsunoda at Racing Bulls, so ours renders his exact
twenty-two-name order with those two slots filled by whoever is actually in the
car.

### The two seats that differ from his list

His list has Hadjar at Red Bull and Lawson at Racing Bulls. Since the Dutch Grand
Prix it has been Lawson at Red Bull and Tsunoda at Racing Bulls, so those two
slots show whoever is actually in the car.

**This is why the driver list is not hardcoded to his twenty-two.** The moment
Hadjar is back — Monza or Madrid — `seed:applyLineup` puts him in the roster and
the picker becomes byte-identical to his form with no code change, because `HAD`
is already at position six of `CHINWAG_DRIVER_ORDER`. Freezing his list instead
would offer a vote for a driver who is not racing, and would keep offering it if
he is not fit in time.

Order copied, grid live. It looks like his form and it cannot be wrong about who
is in the car.

Nothing on the page explains any of that. An earlier version surfaced the
`entryUnconfirmed` flag from `shared/pendingEntry.ts` as an `Unconfirmed` chip
and printed the note about Red Bull's line-up above the questions. Both are
right, and both were cut: this is a minimal thing for him to review, and a poll
that editorialises about the grid is us putting our voice on his page. The flag
still exists in the data if he ever wants it.

**Maintenance:** when the grid changes for real, both lists want editing, the
same way his form does.

Results appear only after voting. A running tally on the form is a nudge, and
the point of the numbers is that they are what his audience thinks rather than
what the first voters thought.

Driver and team options come from the same round-scoped roster the game uses, so
the grid is right without anyone editing a list.

### Results board

Its own URL, in the same palette, designed to be legible on a stream at 1080p:
question, leading answer, coral percentage bars, total votes, updating live over
the Convex socket. Two columns so all six categories fit a 16:9 frame without
scrolling, because he is sharing it, not scrolling it. This is the artefact he
uses on air, and the thing Forms cannot give him.

### Cross-platform links

A `More from Tommo` card at the end of the vote page: `Subscribe on YouTube` and
`Listen on Spotify` as buttons, then X, Instagram and TikTok as icons. His
wording and his site's hierarchy.

His audience is split across platforms and the poll is the one thing all of them
open. Someone who found the Chinwag on YouTube has no reason to know he is on X;
someone who saw the link in a tweet may never have watched an episode. A vote is
the moment they are already on his page with nothing left to do.

Accounts, from the footer of tommccluskey.co.uk:

| Platform  | URL                                                                   |
| --------- | --------------------------------------------------------------------- |
| YouTube   | `youtube.com/@TommoMcCluskey`                                         |
| Spotify   | `open.spotify.com/show/09RI2C2WyVwR02wYTXCDMR` (Tommo's Race Chinwag) |
| X         | `x.com/TommoMcCluskey`                                                |
| Instagram | `instagram.com/tommomccluskey`                                        |
| TikTok    | `tiktok.com/@tommomccluskey`                                          |

Every one opens in a new tab, because inside an embed a plain link navigates the
frame and leaves his site showing YouTube in a box.

One quiet row, every platform at the same weight. This started as two filled
crimson buttons for YouTube and Spotify above an icon row, which turned the end
of the page into an advert: the loudest thing on a page whose whole pitch is
that it asks nothing. Levelling them also stops us ranking his channels for
him, which is not ours to do.

Not on the results board. That board's job is to fit a 16:9 frame during the
show, and a follow card on his own stream is both redundant and one more thing
pushing the numbers off screen.

### Link preview

`/og/chinwag` renders the card that appears under his post, in his palette with
the running vote count, flipping to Bangers & Clangers when the race finishes.
Not `brandCardFrame`: a Grand Prix Picks card under his tweet reads as him having
posted the wrong link.

Five-minute cache, deliberately short. Unlike the site's own cards this one is
meant to go stale quickly, and every state it can be caught in is a true one.

### The demo board

`/poc/chinwag/demo` is a fixed board for the proposal. Two links go to him: the
vote page and this.

The live board reflects whatever the poll is doing right now, which is a
liability in an email — an empty board, a pre-race phase with nothing to compare,
or a race that has moved on by the time he opens it. The demo always shows the
same thing and is still worth looking at a week later. It renders through the
same `ChinwagResultsBoard` as the live one, so he is shown the component he would
get rather than a mock-up that can drift away from it.

**What is real:** the 2026 Dutch Grand Prix, and both settled facts. Norris took
pole at Zandvoort and won from it.

**What is not:** every vote count and percentage. Nobody has voted on this yet;
that is what makes it a proposal. The board carries an `Example data` chip for
that reason — those numbers must never be mistaken for his audience's, wherever
the link ends up. It is one small chip, not a watermark, so it does not get in
the way of what he is being shown.

### Admin

A tab in `/admin`. Pick the race, open pre-race or post-race, close voting, turn
auto-advance on, export CSV, clear a race's votes. It also prints what the
calendar thinks the poll should be doing, so a mismatch is visible.

Auto-advance is the real answer to who runs this. The panel is the override for
when a weekend goes sideways. He gets an account with `isAdmin` off and a
poll-scoped grant, or Barry runs it: decide after he says yes.

## De-duplication

A random id in `localStorage`, sent with the vote. Voting again from the same
browser **updates** the existing answer rather than adding a second one.

That is weaker than Google's per-account limit and we say so in the pitch. It
stops accidental double-taps and casual re-votes; it does not stop someone who
opens a private window. For "62% think Verstappen takes pole" that is fine.

We deliberately do **not** hash IPs. It would only close half the gap, and it
means storing a derived identifier for his audience in our database. If he
raises it, the honest answer is a per-round vote cap by IP hash as a follow-up,
not something to build on spec.

## Privacy

Six answers and a random browser id per vote. No email, no name, no IP, no
tracking. His audience's responses sit in our Convex; he gets the CSV. We never
message his people.

## Hosting

Preference order, all serving the same page:

1. `predictions.tommccluskey.co.uk` via CNAME. Reads as his site, Google indexes
   it for him, our footer credit is a real outbound link from his hostname.
2. Squarespace page with a Code Block iframe. Ten minutes for him, no DNS. Put
   the credit line on the Squarespace page, not only inside the frame.
3. `tommo.grandprixpicks.com`. Fallback only, and only after he says yes.

Footer: one line, `Built by Grand Prix Picks`, linked.

## Whose page it looks like

Three things beyond the palette, each of which would otherwise put Grand Prix
Picks on his page:

- **Favicon.** `public/chinwag/favicon.svg` plus PNG fallbacks: a chequer in his
  coral and near-black. He has not set one on his own site (it still serves the
  Squarespace default), so there was nothing of his to borrow, and the root
  layout's chartreuse wordmark in the tab of his page was wrong.
- **The unread tab badge is off here.** `UnreadTabIndicator` writes the last
  `<link rel="icon">` in the document by design and prefixes the title with an
  unread count. Both are our chrome. It is now gated on `isBareRoute`, alongside
  the header, footer and install banner. It only ever mounts for a signed-in
  Grand Prix Picks user, so his audience would never have seen it, but Barry
  reviewing the page would have.
- **The credit carries the mark**, drawn in his ink rather than our chartreuse.
  Chartreuse on coral is a fight, and a brand colour nobody asked for on someone
  else's page reads as a sticker. Monochrome, it reads as a signature.

## POC gating

While it is a POC it lives at `/poc/chinwag`:

- `?k=<CREATOR_POLL_PREVIEW_KEY>` required in production; open in dev
- renders outside the site shell entirely (`lib/bareRoutes.ts`): no Grand Prix
  Picks header, nav, footer or install banner, because wrapped in our chrome it
  stops being his page and becomes an advert with a poll in it
- `noindex, nofollow`
- absent from `sitemap.xml`
- no inbound links from anywhere on the site
- no Clerk on the page (registered in `clerk-free-routes.ts`)

He should see it before the internet does.

## Deliberately not in scope

- Scoring individuals, or a leaderboard. It is the obvious next step and it is
  wrong: it turns his poll into our game, needs accounts to mean anything, and
  hands him a support burden. The reason this works is that it asks nothing of
  him. Crowd-level facts on the board are not the same thing and are fine.
- A presenter mode that reveals one category at a time. Genuinely good, and the
  right thing to build if he bites, not on spec.
- Per-platform vote attribution (`?from=yt`). Same: back pocket.
- Any prompt to create a Grand Prix Picks account. The footer credit is the
  whole commercial ask.
- Generalised multi-creator configuration.

## Timing

Monza is 4-6 September and his form for it is already up. Target the Madrid
weekend, 11-13 September.

## Contact

`me@tommccluskey.co.uk`, from his X bio. Send the link and three lines: you
noticed the weekly form, you built this, keep the form running until you're
sure. No promo ask.
