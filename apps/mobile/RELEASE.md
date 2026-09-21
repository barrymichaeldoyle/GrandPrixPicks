# Releasing the mobile app

## Before the first production build

**1. Set the build-time environment variables on EAS.** The app reads nine
`EXPO_PUBLIC_*` values at build time. A cloud build has no `.env.local`, so
anything missing here ships as `undefined`: no backend, no auth, no crash
reporting, and no obvious symptom until someone opens the app.

Each build profile in `eas.json` names an EAS environment
(`development` / `preview` / `production`), so set them per environment:

```sh
eas env:create --environment production --name EXPO_PUBLIC_CONVEX_URL --value https://<prod>.convex.cloud
```

| Variable                                | Notes                                  |
| --------------------------------------- | -------------------------------------- |
| `EXPO_PUBLIC_CONVEX_URL`                | Production deployment, not the dev one |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`     | The `pk_live_…` key for production     |
| `EXPO_PUBLIC_SENTRY_DSN`                |                                        |
| `EXPO_PUBLIC_SENTRY_ENV`                | `production`                           |
| `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Defaults to `0.2`                      |
| `EXPO_PUBLIC_POSTHOG_KEY`               |                                        |
| `EXPO_PUBLIC_POSTHOG_HOST`              |                                        |

**Do not set `EXPO_PUBLIC_SENTRY_RELEASE` or `EXPO_PUBLIC_SENTRY_DIST`.**
`@sentry/react-native` uploads source maps and dSYMs under
`<bundleId>@<version>+<buildNumber>` with dist `<buildNumber>`, and derives the
same pair at runtime when neither is set, so leaving them empty is what keeps
the two in agreement. A hand-pinned value only creates a way for them to
diverge: `autoIncrement` moves the build number every build, and the symptom is
silent, since the upload still succeeds and the build log still looks clean
while every crash arrives minified. They were removed from
`check-release-env.mjs` on 2026-09-09 for that reason.

The `eas-build-pre-install` hook checks all ten variables below for the
production profile, including the Sentry upload secrets, and rejects a build
that would otherwise ship without them. It also rejects a non-live Clerk key
or a Sentry environment other than `production`.

**2. Set the Sentry upload secrets**, or the first production crash arrives as
minified frames and tells you nothing:

```sh
eas env:create --environment production --name SENTRY_AUTH_TOKEN --value <token> --type secret
eas env:create --environment production --name SENTRY_ORG --value <org>
eas env:create --environment production --name SENTRY_PROJECT --value <project>
```

Sentry 8's pnpm-aware build scripts and Metro integration are enabled. A
production build intentionally fails if upload credentials are missing or an
upload fails; do not bypass that check. Confirm the EAS build log contains
successful source-map and dSYM uploads before sending the build to TestFlight.

## Building

```sh
eas build --profile preview --platform ios       # internal testing
eas build --profile production --platform all    # store builds
eas submit --profile production --platform ios
```

A submission that ends in `EAS_UPLOAD_TO_ASC_VERSION_DUPLICATE` has usually
already succeeded. Apple burns a build number the moment it accepts the upload,
permanently and per version train, so the second `eas submit` of the same
binary is refused whether or not the first one worked. `eas submit` prints only
"Something went wrong" and the Expo web page shows no logs; the real message
lives on the submission's `jobRun.errors` in the GraphQL API. **Look in
TestFlight before resubmitting.** If the build is there, you are done. If it is
not, Apple accepted and then discarded it during processing (check the rejection
email), and the fix is a rebuild for a fresh number, never a retry.

`appVersionSource` is `remote`, so EAS owns the build number and
`autoIncrement` bumps it on every production build. The `version` in
`app.json` is still yours to set. The iOS build number is deliberately omitted
from app config because EAS ignores it in remote-version mode.

App Store listing fields are kept in `store.config.json`. Validate them with
`eas metadata:lint`; after the first binary reaches App Store Connect, publish
them with `eas metadata:push`.

## Native projects are generated

`ios/` and `android/` are **not** in git. This app uses Continuous Native
Generation: `app.json` and `plugins/` are the whole source of truth, EAS runs
`expo prebuild` on its own servers for every build, and a local `pnpm ios` or
`npx expo run:ios` regenerates a local copy that nobody commits. Anything
hand-edited in `ios/` is lost on the next prebuild, so native config goes in
one of two places instead:

- `app.json`, for anything Expo has a key for. The privacy manifest lives in
  `ios.privacyManifests`; the icon, splash, entitlements (`usesAppleSignIn`,
  `associatedDomains`) and Info.plist keys already did.
- A config plugin in `plugins/`, for the rest. `withReleasePushEntitlements.cjs`
  gives the Release build its own entitlements file asking for the production
  APNs gateway. Debug and Release used to share one file asking for
  development, and a store build made from it registers sandbox tokens and
  silently delivers no notifications at all.

`ios/` used to be committed, and every prebuild (including the one `expo
run:ios` runs first) deleted the hand-maintained Release entitlements and
privacy manifest. The app icon also sat in the committed catalog as Expo's
blank placeholder long after `app.json` pointed at a real one.

`scripts/check-native-assets.mjs` runs as part of `pnpm lint`. It prebuilds
into a throwaway directory and fails if the result is missing the push
entitlement per configuration, Sign in with Apple, the associated domain, the
privacy manifest or the icon, or if `ios/` has been committed again. The icons
themselves are generated from the shared brand mark by
`apps/web/scripts/render-logo-png.mjs`, so regenerate there rather than editing
PNGs.

A change to `app.json`, `plugins/` or a native dependency needs a new
development build (`eas build --profile development`) before the dev client can
see it; JavaScript-only changes do not.
