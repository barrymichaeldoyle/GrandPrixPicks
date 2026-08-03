# design-sync notes — Grand Prix Picks

Working notes for syncing `apps/web`'s design system to claude.ai/design.
Read this before touching `.design-sync/config.json`.

## The shape of this repo

`apps/web` is an **application**, not a published component library: it is
`private`, has no `dist/`, and its `package.json` has no `types`. The converter
needs two things a library would have given it for free — a bundleable export
entry and a `.d.ts` tree — so this sync synthesises both under
`.design-sync/ds-package/`:

- `entry.tsx` — the barrel naming every component claude.ai/design may build
  with. **Imports must be relative** (`../../apps/web/src/...`), not `@/...`:
  the emitted `entry.d.ts` keeps whatever specifier the source used, and
  ts-morph resolves the declaration tree without our path aliases, so `@/`
  aliases there yield `exported PascalCase symbols: 0` and every title lands in
  `[TITLE_UNMAPPED]`.
- `package.json` — exists only so the converter's `PKG_DIR` walk stops here
  instead of at the repo root, and so `types` points at the generated tree.
- `types/` — generated, gitignored. `rootDir` is the repo root so the emitted
  tree mirrors the repo, which is what makes the relative specifiers resolve;
  that is why `types` is the deep `./types/.design-sync/ds-package/entry.d.ts`.
- `PreviewRoot.tsx` — the provider chain, see below.

`buildCmd` regenerates tokens **and** the declarations. It ends in a `test -f`
on the emitted entry declaration rather than trusting tsc's exit code, because
tsc exits 2 on the 4 known errors below while still emitting all 149 files.

## Known, accepted tsc errors (4)

Declaration emit reports 4 errors and emits anyway. All four are pre-existing
gaps where the repo's own storybook mocks are narrower than the real APIs:

- `mockClerkReact.SignInButton` has no `fallbackRedirectUrl` /
  `signUpFallbackRedirectUrl` (hit by `RaceScoreCard/CardActions.tsx` and
  `SignedOutRacePreview.tsx`).
- `mockConvexReact.useMutation` returns a 0-arg function, but
  `PredictionForm.tsx` calls it with 1 argument.
- `analytics.ts` passes `string | boolean` where `string` is wanted — a
  consequence of the local `ImportMetaEnv` shim being looser than
  `vite/client`.

None of them touch the props of the 25 synced components, and none reach the
emitted surface. Vite never typechecks storybook, which is why they were
invisible before. Fixing the mocks in `apps/web/src/storybook/` would clear
them, but that is app source and outside this sync's footprint.

## Gotchas that cost real time

- **Never put a `"//"` comment key in `.design-sync/tsconfig.ds.json`.** The
  converter strips `//` line comments with a regex that only spares `//`
  preceded by `:`, so a `"//"` key corrupts the JSON, `JSON.parse` throws, and
  `tsconfigPathsPlugin` returns `null` _silently_ — every `@/` import then fails
  to resolve with no hint that the tsconfig was ignored.
- **`tsconfig.ds.json` keeps `baseUrl`; `tsconfig.dts.json` must not.** The repo
  is on TypeScript 7, which removed `baseUrl` (error TS5102), so the tsc-facing
  config spells its paths relative to itself. The converter's own mini-parser is
  not tsc and still honours `baseUrl` — the two configs are deliberately
  different and must stay that way.
- **The `.dark` class is load-bearing.** Every token in `tokens.generated.css`
  is declared under `.dark, [data-theme='dark']`. Without it _every_ colour
  falls back to a browser default. It must go on `documentElement`, not just a
  wrapper, because Tooltip and ConfirmDialog portal onto `document.body`.
- **`.design-sync/node_modules` must be a symlink to `apps/web/node_modules`.**
  `PreviewRoot.tsx` lives outside `apps/web`, and pnpm keeps `react` under
  `apps/web/node_modules`, so TypeScript's upward walk from `.design-sync/`
  finds nothing. `buildCmd` recreates the symlink (it is gitignored, so every
  fresh clone needs it). Do **not** "fix" this with a `paths` entry for `react`:
  mapping it at the repo root resolves to the untyped JS package and takes the
  whole program from 4 errors to 275.
- **CSS comes from the storybook build, by design.** `apps/web/src/styles.css`
  is Tailwind 4 source (`@import 'tailwindcss'`), which is not real CSS until
  the Tailwind compiler runs. `cfg.cssEntry` is therefore deliberately unset so
  `[CSS_FROM_STORYBOOK]` scrapes the compiled stylesheet out of
  `.design-sync/sb-reference`. Rebuild the reference whenever styling changes.
- **`@tanstack/react-router` must stay in `cfg.extraEntries`.** [GENERAL] A story
  that imports `Link` (Button's "As Child With Router Link") rendered
  `Cannot read properties of null (reading 'stores')`. Cause: story modules are
  compiled separately from the bundle, so the story's copy of the router was a
  _second_ instance and its context never matched the one `StorybookRouter`
  provides. Listing the package in `extraEntries` merges its exports onto
  `window.GrandPrixPicks`, so story imports shim to the same instance. Removing
  it silently breaks every story that renders a `<Link>`.
- **`mockAppRuntime` must be shimmed AND fully re-exported.** [GENERAL]
  FollowButton's "Fetches Its Own State" rendered its caption text but no
  buttons. Cause: `FollowButton` itself resolves to the bundle, but the story's
  `StorybookMockProviders` was compiled a second time into the preview, so the
  story populated a _different_ React context than the bundled
  `mockConvexReact.useQuery` reads. The query returned `undefined` and the
  component returns `null` in that state. Two halves to the fix, both required:
  `cfg.storyImports.shim: ["src/storybook/mockAppRuntime"]` forces the module to
  the global, and `entry.tsx` must export the module's **non-component** helpers
  too (`buildStorybookConvexMocks` above all) or the shimmed namespace has holes
  and the provider silently gets no mocks. Affects any story wiring its own mock
  state: FollowButton, FeedItem, RaceEventPage.
- **`<Flag>` renders empty everywhere outside the app, and always has.**
  `Flag.tsx` loads same-origin `/flags/<code>.svg` from `apps/web/public/`.
  Storybook sets no `staticDirs`, so those 404 in the reference build too, and
  the component's own `hideBrokenFlag` hides the element rather than showing a
  broken-image glyph. Both compare panels therefore agree while showing no
  flags. This is **not** `[ASSETS_BLOCKED]` (remote avatars in FeedItem load
  fine) — it is the component's asset contract. Nothing in the sync can fix it:
  the path is absolute, and the design project does not serve files at `/`.
- **`[PORTAL?]` from compare is advisory, not a defect.** It fired for
  DriverBadge, FeedItem, H2HMatchupGrid and RaceEventPage. `package-validate`
  measures real geometry and flagged none of them as escaping their cells, and
  the renders match. FeedItem and RaceEventPage are on `cardMode: "column"`
  because their stories are genuinely wide; DriverBadge and H2HMatchupGrid need
  no override. Only `ConfirmDialog` is `cardMode: "single"`, where the overlay
  really does escape.
- **Storybook mocks are aliased in, on purpose.** `tsconfig.ds.json` maps
  `@clerk/react` and `convex/react` to `apps/web/src/storybook/mock*.tsx`,
  mirroring the vite aliases in `apps/web/.storybook/main.ts`. This is what lets
  auth- and data-driven components render a signed-in demo state in a tool with
  no Clerk and no Convex behind it.
- **The contact sheet lies at small sizes.** Three separate times a "difference"
  on the shrunk compare sheet (a tint shift on H2H pills, different driver
  numbers, a 5-hour timezone gap on RaceEventPage) vanished at full resolution.
  Always open the `raw/*__sb.png` / `*__ds.png` pair before grading anything
  below `match`.

## Grading result (2026-07-28)

22 components, 71 stories: **68 match, 3 close, 0 mismatch**. The three `close`
verdicts are all `Flag` (see its bullet above); `Flag`'s "Missing Asset" story
is a legitimate `match` because a hidden element is the intended result there.
`ConfirmDialog`'s "Loading" and "With Error" are `match` with a note: the
storybook reference is the clipped side, not the preview.

## Re-sync risks — read this before trusting a carried-forward grade

- **`RaceEventPage` is graded on 6 of its 7 stories.** `[STORY_CAP]` caps
  capture at 6; "Finished Scored" has never been individually graded. Pass
  `--max-stories 7` if that story starts carrying a distinct variant.
- **The reference storybook is a build artifact, not a checked-in file.** It is
  gitignored, so a fresh clone has no oracle until you rebuild it (§2.2). If
  `apps/web/src` styling changes and you do NOT rebuild it, `[REFERENCE_STALE?]`
  fires and every grade is measured against the OLD design.
- **The 4 accepted tsc errors are load-bearing signal.** If that count moves,
  the storybook mocks and the real Clerk/Convex APIs have drifted further apart.
  Do not just bump the number; look at what changed.
- **`cfg.provider` (`PreviewRoot`) replaced the storybook decorators.** The two
  can now drift: an edit to `apps/web/.storybook/preview.tsx` will change the
  reference side while previews keep using `PreviewRoot`, which shows up as a
  whole-roster mismatch. Mirror any decorator change into
  `.design-sync/ds-package/PreviewRoot.tsx`.
- **A redesign is planned** ("Timing Sheet Minimal": `#101113` base, `#FF5C00`
  accent, Archivo + IBM Plex Mono, 4px/2px radii, team colours demoted to an
  edge bar). It is being designed in a SEPARATE Claude Design project. When it
  lands in code, essentially every grade here is void and this project should be
  re-synced from scratch with `--force`.
