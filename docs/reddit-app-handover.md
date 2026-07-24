# Reddit App Handover

**Last updated:** 24 July 2026

**Current phase:** Phase 0 feasibility prototype

**Package:** `apps/reddit`

**Product specification:** [devvit-product-specification.md](./devvit-product-specification.md)

## Where the prototype stands

The first Devvit Web slice is implemented and builds successfully. It uses the
current official React structure with a React webview, Hono server routes,
Devvit-authenticated request context, and installation-local Redis.

The prototype currently provides:

- a moderator-only subreddit menu action that creates the current race post;
- idempotent post creation for the bundled race;
- an inline launch screen and expanded Top 5 picker;
- qualifying and race tabs for the 2026 Hungarian Grand Prix;
- the complete 2026 driver field bundled with the app;
- selection, removal, and ordering of exactly five unique drivers;
- saved picks and revisions in installation-local Redis;
- server-side driver, uniqueness, session, authentication, and lock checks;
- logged-out, loading, saved, error, and locked-session states;
- an installation-local community player count;
- mobile-friendly and keyboard-accessible controls; and
- clear separation between Reddit picks and website picks.

The Top 5 calculation now lives in `packages/shared/src/scoring.ts`. The Convex
backend re-exports that implementation, so the main product and the Reddit app
have one scoring definition.

## Important prototype constraints

This is not ready for a public beta yet.

1. `devvit.json` uses the provisional app name `gpp-reddit`. It must match an
   app registered to the developer's Reddit account.
2. Race and driver data are bundled in `src/shared/race.ts`.
3. The bundled Hungarian deadlines are 25 and 26 July 2026. They will be stale
   when development resumes and must be replaced with the next test fixture.
4. Only Top 5 submission is implemented. There is no H2H flow yet.
5. Results publication, scoring materialization, amendments, and leaderboards
   are not implemented.
6. Idempotent post creation is installation-local and race-specific. There is
   no general race-post index yet.
7. The player-count registration uses a simple Redis existence check followed
   by an increment. Replace this with an atomic or sorted-set approach before
   meaningful traffic.
8. No scheduler, installation settings, operator form, or external data fetch
   is configured.
9. No Reddit app registration, upload, or playtest was performed during this
   slice because those actions require the developer account and test
   subreddit.
10. The Devvit build succeeds with a warning about `sourcemapFileNames`. The
    warning originates in the current Devvit/Vite build tooling and does not
    fail the bundle.

## Validation completed

The following passed on 24 July 2026:

```sh
apps/reddit/node_modules/.bin/tsc --build --force
apps/reddit/node_modules/.bin/eslint 'apps/reddit/src/**/*.{ts,tsx}'
```

From `apps/reddit`:

```sh
node_modules/.bin/vite build
```

From `apps/backend`:

```sh
node_modules/.bin/vitest run convex/lib/scoring.test.ts
node_modules/.bin/tsc --noEmit -p convex/tsconfig.json
```

The existing scoring suite passes all four tests. Formatting and
`git diff --check` also pass.

## First task next week: real Devvit playtest

Do this before expanding the feature set. It will validate the assumptions that
cannot be tested in a normal local browser.

1. Create or confirm a private Reddit test subreddit.
2. Register a Devvit app in the Reddit developer portal.
3. Update the `name` in `apps/reddit/devvit.json` if the registered slug is not
   `gpp-reddit`.
4. Replace the stale Hungarian fixture with a future-dated test race. Give
   qualifying enough time to test both revisions and the lock boundary.
5. Install dependencies and log in:

   ```sh
   pnpm install
   pnpm --filter @grandprixpicks/reddit login
   ```

6. Start the playtest:

   ```sh
   pnpm dev:reddit
   ```

7. As a moderator, run **Create Grand Prix Picks post** from the subreddit
   menu.
8. Test the inline launch screen and expanded picker on desktop Reddit and the
   Reddit mobile app.
9. Submit five picks, reload the post, confirm persistence, revise the order,
   and confirm the revision remains after another reload.
10. Try a stale client save after the server deadline and confirm the server
    returns the locked response.
11. Run the menu action again and confirm it navigates to the existing
    canonical post instead of creating a duplicate.
12. Test while logged out and with a second Reddit account.

Record any Devvit context, Redis, entrypoint, or mobile-webview differences in
this document before building around them.

## Recommended implementation order after playtest

### 1. Harden the Top 5 slice

- Extract request validation and Redis key construction into tested pure
  functions.
- Make first-player registration atomic.
- Add tests for invalid driver IDs, duplicates, wrong pick counts, revision
  increments, and exact lock-boundary behavior.
- Store race revision/schema information with entries.
- Add browser draft persistence for unsaved picks.
- Confirm assistive-technology behavior inside Reddit's webview.

### 2. Generalize bundled race data

- Replace the single `prototypeRace` export with a validated, versioned race
  bundle.
- Support regular and sprint weekend session lists.
- Key canonical posts and entries by season, race, and session.
- Add a controlled way to choose the race from the moderator creation flow.
- Keep all lock checks server-authoritative.

### 3. Add H2H

- Bundle stable teammate matchup IDs.
- Keep H2H optional and skippable.
- Validate selections entirely on the server.
- Store H2H revisions separately from Top 5 entries.
- Add the compact H2H flow after a successful Top 5 save.

### 4. Add controlled results and scoring

- Add a moderator/operator result form.
- Validate ordered classifications and monotonically increasing revisions.
- Score entries idempotently with `@grandprixpicks/shared/scoring`.
- Preserve score breakdowns and the active result revision.
- Recalculate rather than append when results are amended.
- Add adversarial tests for the existing one-position-away behavior.

### 5. Add subreddit leaderboards

- Materialize weekend and season totals in installation Redis.
- Implement the tie-breaking policy from the product specification.
- Never expose another player's picks before the relevant session locks.
- Highlight the current viewer and show Combined, Top 5, and H2H totals.

### 6. Add moderator operations

- Installation settings for H2H, automatic posts, lead time, and optional
  flair.
- A status view containing app version, current race, canonical post, player
  count, lock state, and last operation status.
- Scheduler support only after request-time lock behavior is proven.
- Data deletion and uninstall handling before public review.

## Files to start with

- `apps/reddit/devvit.json`: Devvit capabilities, menu, and entrypoints.
- `apps/reddit/src/shared/race.ts`: temporary bundled race and driver data.
- `apps/reddit/src/shared/api.ts`: client/server request contracts.
- `apps/reddit/src/server/routes/api.ts`: initialization and Top 5 saves.
- `apps/reddit/src/server/core/storage.ts`: Redis key and persistence helpers.
- `apps/reddit/src/server/core/post.ts`: idempotent custom-post creation.
- `apps/reddit/src/client/game.tsx`: expanded prediction experience.
- `apps/reddit/src/client/splash.tsx`: inline launch experience.
- `packages/shared/src/scoring.ts`: cross-product Top 5 scoring.

## Commit and worktree note

Before committing, review the complete worktree:

```sh
git status --short
git diff --check
git diff --stat
```

The Reddit implementation includes changes under `apps/reddit`, the shared
scoring extraction, root scripts, package metadata, and `pnpm-lock.yaml`.
`docs/devvit-product-specification.md` and
`docs/web-product-specification.md` are also currently modified in the
worktree, so verify that those edits belong in the same commit.

A suitable commit subject is:

```text
feat: add Devvit prediction prototype
```

No upload, publish, deployment, or Reddit-side mutation is required before
committing this checkpoint.
