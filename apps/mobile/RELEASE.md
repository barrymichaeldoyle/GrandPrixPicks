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
| `EXPO_PUBLIC_SENTRY_RELEASE`            |                                        |
| `EXPO_PUBLIC_SENTRY_DIST`               |                                        |
| `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` |                                        |
| `EXPO_PUBLIC_POSTHOG_KEY`               |                                        |
| `EXPO_PUBLIC_POSTHOG_HOST`              |                                        |

**2. Set the Sentry upload secrets**, or the first production crash arrives as
minified frames and tells you nothing:

```sh
eas env:create --environment production --name SENTRY_AUTH_TOKEN --value <token> --type secret
eas env:create --environment production --name SENTRY_ORG --value <org>
eas env:create --environment production --name SENTRY_PROJECT --value <project>
```

## Building

```sh
eas build --profile preview --platform ios       # internal testing
eas build --profile production --platform all    # store builds
eas submit --profile production --platform ios
```

`appVersionSource` is `remote`, so EAS owns the build number and
`autoIncrement` bumps it on every production build. The `version` in
`app.json` is still yours to set; the `buildNumber` and `versionCode` there are
only the starting point.

## The `ios/` trap

`ios/` is **tracked in git**, so asset and config changes in `app.json` do not
reach the native project on their own. The app icon lived in
`ios/GrandPrixPicks/Images.xcassets/AppIcon.appiconset/` as Expo's blank
placeholder long after `app.json` pointed at a real one, and nothing failed:
it simply shipped blank.

After changing anything in `app.json` that affects native config (icons, splash,
plugins, permissions), either run `npx expo prebuild --platform ios` and commit
the result, or update the native file by hand and check it. The icons
themselves are generated from the shared brand mark by
`apps/web/scripts/render-logo-png.mjs`, so regenerate there rather than editing
PNGs.
