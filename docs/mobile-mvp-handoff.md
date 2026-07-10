# Mobile MVP — Handoff & Next Steps

Status: feature-complete pending review and device verification
Last updated: 2026-07-11

Companion to `docs/mobile-mvp.md` (product scope). This documents what was
built in the July 2026 push, what needs human hands before submission, and
how to verify it all.

## What's built (commit trail on main)

| Area                                                                                                                                    | State | Key commits          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------- |
| Expo SDK 57 / RN 0.86 upgrade, ios/ regenerated, signing in app.json                                                                    | Done  | `d5ff7b7`            |
| 4-tab navigation (Picks / Feed / Leaderboard / More), out-of-scope screens removed                                                      | Done  | `7b8cb78`            |
| Leaderboard matrix (Weekend/Season × Combined/Top 5/H2H × Global/Following, race chips, pagination, fairness gate)                      | Done  | `f43747e`            |
| Expo push end to end: backend delivery for all five categories, tap deep links, token lifecycle, permission pre-prompt after first save | Done  | `a47e827`            |
| Tailwind v4 migration (react-native-css 3.0.7 + nativewind 5 preview; zero StyleSheet)                                                  | Done  | `60ac4ef`            |
| Feed: 5-page cursor pagination, race+session grouping with ranked mini-leaderboard, top-players discovery with one-tap follow           | Done  | `60ac4ef`            |
| In-app account deletion (App Review 5.1.1(v))                                                                                           | Done  | `32e1137`            |
| `races.getCurrentWeekend` + per-session capability model (server authority; unit-tested) consumed by the picks screen                   | Done  | `32e1137`            |
| Scored-session results on the picks screen + weekend points strip; closing-soon state                                                   | Done  | `8427494`, `2cf0ce3` |
| PostHog analytics (mirrors web: EU host, manual events, Clerk identify); full MVP event list                                            | Done  | `6a9e978`            |
| Decisions recorded: dark-only appearance (matches web), randomize excluded from mobile                                                  | Done  | `6a9e978`, `32e1137` |

Backend changes are deployed to the **dev** Convex instance. Production
backend deploy (`pnpm deploy:backend`) has NOT been run.

## Barry's checklist (in order)

1. **Simulator review pass** — the app hasn't had a human eyeball since the
   restructure. `pnpm dev:mobile` against dev; run
   `convex run seed:reseedDevThroughMonaco` first so rounds 1–6 are scored
   (scored picks view, leaderboard weekend boards, feed session groups all
   need result data to show).
2. **Rebuild the dev client** — native modules changed twice (SDK 57 pods,
   then posthog-react-native + expo-application/device/localization with its
   config plugin). The committed `ios/` is current except the localization
   plugin: run `npx expo prebuild -p ios` once, then `pnpm ios`.
3. **EAS environment variables** (before the next build):
   - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — long-standing
     TODO; until set, crashes arrive minified. Note `ios/.xcode.env` disables
     the Sentry upload build phase (`SENTRY_DISABLE_AUTO_UPLOAD=true`)
     because @sentry/react-native 7.11's scripts break under pnpm — remove
     that flag only after Expo blesses Sentry 8.x.
   - `EXPO_PUBLIC_POSTHOG_KEY` (and `EXPO_PUBLIC_POSTHOG_HOST` if not EU
     default) — analytics is a silent no-op without it.
4. **Production backend deploy** — `pnpm deploy:backend` ships the Expo push
   delivery leg, `getCurrentWeekend`, and the notification fan-out changes.
   Mobile builds pointed at prod need this before push/picks work.
5. **App Store Connect**:
   - APNs push credentials via EAS (`eas credentials`).
   - Privacy nutrition labels — declare first-party analytics (PostHog) and
     account data; no ATT needed (no cross-app tracking).
6. **TestFlight on a physical device** — the remaining untestable-in-CI
   surface: push delivery per category, tap deep links (warm + cold start),
   permission pre-prompt after first pick save, token removal on sign-out,
   account deletion end to end. Plan says one full race weekend on
   TestFlight before submission.
7. **Decide (optional)**: EU consent parity for mobile analytics — web only
   captures after cookie consent; mobile captures by default in prod. Add a
   first-run opt-in if wanted.
8. **Web TODO (unrelated but open)**: remove the stale second Clerk instance
   cookie on prod.

## Deferred (post-MVP, by design)

- Android release: FCM, Play Console, data-safety form, device matrix.
- Native league surfaces (web handoff ships in More).
- Historical race browser; full profile/prediction-history screens.
- Light theme (dark-only decision, 2026-07-11).
- `tailwind-merge`/`clsx` are installed but unused until a `cn()` helper is
  needed (knip-ignored).

## Verification cheat sheet

```bash
pnpm --filter @grandprixpicks/mobile typecheck   # mobile TS
pnpm test:mobile                                  # mobile unit tests
cd apps/backend && pnpm vitest run                # backend tests (101)
pnpm knip && pnpm lint && pnpm typecheck          # repo-wide gates
cd apps/mobile && npx expo export -p ios          # Metro bundle smoke test
```

The Metro export is the canary for the Tailwind pipeline: `react-native-css`
must stay on 3.x and `lightningcss` is pinned to 1.30.1 in
`pnpm-workspace.yaml` overrides — bumping either without re-running the
export has broken bundling before.

## Known sharp edges

- **Expo pins exact native-module versions** — `npx expo install --fix` is
  the only sanctioned way to bump reanimated/screens/svg/worklets/
  safe-area-context/gesture-handler; `typescript` and `react`/`react-dom`
  are intentionally excluded from its checks (`expo.install.exclude`).
- **`type: module` in apps/mobile** — any new root config file must use the
  `.cjs` extension (babel.config.cjs, metro.config.cjs) or Metro/Babel break.
- **Push deep-link contract** — pushes carry `data.url` with a site path;
  mobile routes exactly `/races/{slug}`, `/feed/{id}`, `/feed`. New push
  destinations must extend the payload, not the parser
  (`src/lib/pushRouting.ts`).
- **Capability model** — clients read writability from
  `races.getCurrentWeekend`; mutations stay the final authority. Don't
  re-derive lock rules client-side (`convex/lib/weekendCapabilities.ts`).
