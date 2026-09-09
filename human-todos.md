# iOS release — human handoff

Last audited: 2026-09-07

The repository and simulator QA are complete. The items below need an Apple,
EAS, Clerk, Convex, PostHog, or Sentry dashboard, a physical iPhone, or a
product decision. Do them in this order.

The universal-link association file was deployed to `grandprixpicks.com` and
verified on 2026-09-07.

## 1. Prepare the production services

- [x] Confirm the Apple Developer Program membership for team `LBZ6C9H52C`
      is active.
- [x] Create the App Store Connect record for bundle ID
      `com.barrymichaeldoyle.grandprixpicks`. Created 2026-09-09 as
      "Grand Prix Picks" (SKU `grand-prix-picks-ios`, Apple ID `6810265048`,
      now set as `submit.production.ios.ascAppId` in `apps/mobile/eas.json`).
      The App ID itself already existed as "A Formula 1 Results Prediction
      App"; Push Notifications and Associated Domains were missing from it and
      were enabled by hand, so the next build regenerates provisioning
      profiles.
- [ ] Deploy and verify the production Convex backend before building the app.
- [ ] Use a Clerk production instance and confirm the Convex production auth
      issuer matches it. A `pk_test_…` key is intentionally rejected for a
      production build.
- [ ] Configure APNs credentials in EAS.

## 2. Configure EAS production variables

The production EAS environment currently has **no variables**. The build guard
will fail until all twelve are present:

```text
EXPO_PUBLIC_CONVEX_URL
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_SENTRY_DSN
EXPO_PUBLIC_SENTRY_ENV
EXPO_PUBLIC_SENTRY_RELEASE
EXPO_PUBLIC_SENTRY_DIST
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
EXPO_PUBLIC_POSTHOG_KEY
EXPO_PUBLIC_POSTHOG_HOST
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

Use the production Convex URL, a `pk_live_…` Clerk key, and exactly
`production` for `EXPO_PUBLIC_SENTRY_ENV`. Keep `SENTRY_AUTH_TOKEN` secret.
See `apps/mobile/RELEASE.md` for the commands and source-map checks.

## 3. Create the first store build

No iOS EAS build exists yet.

```sh
cd apps/mobile
eas build --profile production --platform ios
eas submit --profile production --platform ios --latest
```

Confirm the build log shows successful Sentry source-map and dSYM uploads.
Then complete App Store Connect metadata, screenshots, age rating, privacy
nutrition labels, export compliance, and App Review contact/demo credentials.
The validated metadata is in `apps/mobile/store.config.json`; screenshots,
review notes, and the data-disclosure inventory are in `apps/mobile/STORE.md`.

## 4. Physical-device TestFlight QA

The simulator cannot certify these:

- [ ] Sign in with Apple and Google, including cancellation and error paths.
- [ ] Push permission pre-prompt after the first saved pick.
- [ ] Delivery for every notification category and routing from both warm and
      cold starts.
- [ ] Push-token removal after sign-out.
- [ ] Account deletion end to end with the real production Clerk/Convex pair.
- [ ] App icon, launch screen, keyboard, alerts, and Support/Privacy/Terms
      browser surfaces on a real-density device.
- [ ] VoiceOver, large Dynamic Type, Reduce Motion, and a poor/offline network.
- [ ] Keep the TestFlight build installed through one race weekend before
      submission.

Support, Privacy, and Terms URLs returned HTTP 200 during this audit. Recheck
their final copy before submission.
