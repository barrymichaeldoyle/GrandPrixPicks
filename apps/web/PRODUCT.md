# Product

<!-- impeccable:product-schema 1 -->

Web-app record for Grand Prix Picks. It **inherits** the cross-app product truth
in the repo-root `PRODUCT.md` (users, purpose, positioning, capabilities, brand
commitments, evidence, principles) and overrides only what is specific to the
web surface. Where the two disagree, this file wins for `apps/web`.

Full implemented-behavior reference: `docs/web-product-specification.md`.

## Platform

web

## Users

Primary: **the solo Formula 1 fan landing cold from search, Reddit, or a shared
social card.** They have no account, no league invite, and no prior relationship
with the product. They are deciding in a single visit whether to play.

This is the web app's specific inheritance of the shared primary user, and it is
sharper here than on native: mobile installs are a deliberate act, whereas a web
visit is frequently accidental. Organic and first-visit conversion is the active
growth focus. League virality is not currently working and is not the lever.

Returning authenticated players are the second audience and the heavier users,
but they are already converted. When first-visit clarity and returning-player
density conflict on a public route, first-visit clarity wins; on authenticated
routes, the reverse.

## Operating Context

**Phone, shortly before lights out.** The typical web pick is made on a mobile
browser under time pressure, minutes to an hour before the session locks. Desktop
exists and matters for the calendar, standings, and admin work, but it is not the
scene the pick flow is designed for.

Web-specific context the shared record does not cover:

- **Server rendering is a product requirement, not an optimization.** Public
  landing, race, profile, and leaderboard pages must server-render with
  meaningful metadata, because search and social crawlers are the primary
  acquisition path for the primary user.
- **Try before signup.** Logged-out visitors can assemble a Top 5 or H2H draft
  locally, and that draft must survive the sign-in transition and auto-submit.
  Losing a draft at the auth boundary is a conversion failure, not a bug in a
  secondary flow.
- **Sign-in mounts beside the page.** Clerk's modal portals to body rather than
  swapping providers or remounting, so authentication does not tear down
  in-progress work.
- **Share cards are a distribution surface.** Open Graph images render live
  per-race and per-user data through `server/routes/og/` and `src/lib/og/`.
  For many first-time visitors the share card is the first impression, seen
  before any page.
- **Offline and service worker.** Stale data must never be presented as a
  confirmed successful prediction save.

## Capabilities and Constraints

Inherits the shared game rules, scoring, Season Pass terms, and non-goals.
Web-specific:

**Route inventory** (audience, purpose): see specification section 25. Public:
`/`, `/races`, `/races/:raceSlug`, `/leaderboard`, `/leagues`, `/leagues/:slug`,
`/p/:username`, `/pricing`, `/sign-in`, `/terms`, `/privacy`, `/refund-policy`,
`/results-policy`, `/about`, `/how-to-play`, `/guides`, `/f1-standings`.
Player-only: `/feed`, `/feed/:feedEventId`, `/leagues/create`,
`/leagues/:slug/settings`, `/me`, `/settings`, `/notifications`, `/pay`,
`/support`. Site admin: `/admin`, `/admin/races/:raceId`.

`/` is dual: a signed-out landing page and an authenticated race-weekend home.
These are two different jobs on one URL and the SSR auth branch decides between
them.

**Anonymous capability boundary.** Anonymous visitors may view the home page,
calendar, public race pages, published results, global leaderboards, public
league summaries, public profiles, eligible historical prediction data, pricing,
and legal pages, and may assemble a local draft. They cannot save predictions,
appear on leaderboards, follow, view a personalized feed, join or manage
leagues, purchase, manage settings, or use the authenticated support form.

**SEO surfaces exist as an acquisition mechanism**, not as filler: `/f1-standings`
carries the real F1 championship (distinct from the game's `/leaderboard`),
alongside `/guides`, circuit guides, `/about`, and `/how-to-play`. Placeholder or
thin pages on this app previously caused a real AdSense low-value-content
rejection, so any new public route must carry genuine content or be `noindex`.

**Technical constraints that shape design:**

- Deployed to Cloudflare Pages. An uncaught throw during SSR is fatal in
  production even though local dev recovers from it.
- All data flows through Convex. There are no REST API routes; server routes
  exist only for webhooks, OG rendering, sitemap, and share redirects.
- Long feeds and season leaderboards paginate rather than loading unbounded
  history.
- The React Compiler runs in production builds only, so dev is unmemoized.

## Product Principles

Inherits the six shared principles. The two that bind hardest on web:

1. **Earn the first visit.** Public routes must server-render, be
   comprehensible without an account, and let the visitor start playing before
   signing in.
2. **The pick loop is the product**, and on web it is a mobile pick loop against
   a hard deadline.

Web-specific addition:

3. **A public route must be worth indexing.** Every public page either carries
   real content a person would want to land on, or it is `noindex`. Thin pages
   are an active liability here, not neutral.

## Accessibility & Inclusion

Inherits the shared requirements. The web-specific risk concentration is
`src/components/PredictionForm.tsx`: it is drag-and-drop, it is the core
interaction, and it is most often used on touch under time pressure. Its
keyboard and pointer equivalents are a hard requirement, not a progressive
enhancement.
