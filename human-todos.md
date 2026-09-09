# iOS release — human handoff

Last audited: 2026-09-09

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
- [x] Deploy and verify the production Convex backend before building the app.
      Verified 2026-09-09: `convex function-spec --prod` answers from
      `https://cheery-tern-274.convex.cloud`.
- [x] Use a Clerk production instance and confirm the Convex production auth
      issuer matches it. Verified 2026-09-09: prod Convex
      `CLERK_JWT_ISSUER_DOMAIN` is `https://clerk.grandprixpicks.com`, the
      production Clerk instance the web app has used for months. The matching
      publishable key is `pk_live_Y2xlcmsuZ3JhbmRwcml4cGlja3MuY29tJA==`
      (derived from that domain; confirm it against the Clerk dashboard before
      pasting). A `pk_test_…` key is intentionally rejected for a production
      build.
- [ ] Configure APNs credentials in EAS. Note: the only APNs key on the team is
      `R6TX8G2A5N` ("Expo Push Notifications Key", team-scoped, all topics,
      Sandbox & Production), which EAS can reuse for this app. The key named
      "Grand Prix Picks" (`SU2XX6L8U4`) is a **Sign in with Apple** key, not
      APNs. `eas build` offers to reuse or create a push key interactively, so
      this can be settled during the first build.

## 2. Configure EAS production variables

**Done 2026-09-09.** All ten are set and verified with `eas env:list production`:

```text
EXPO_PUBLIC_CONVEX_URL                 https://cheery-tern-274.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY      pk_live_Y2xlcmsuZ3JhbmRwcml4cGlja3MuY29tJA==
EXPO_PUBLIC_SENTRY_DSN                 (project grand-prix-picks, org barry-michael-doyle)
EXPO_PUBLIC_SENTRY_ENV                 production
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE  0.2
EXPO_PUBLIC_POSTHOG_KEY                phc_Ew9BO6y2HduHlitib7W2A88yWwvxse0xYqcdpOXd10e
EXPO_PUBLIC_POSTHOG_HOST               https://eu.i.posthog.com
SENTRY_ORG                             barry-michael-doyle
SENTRY_PROJECT                         grand-prix-picks
```

`SENTRY_AUTH_TOKEN` is stored with **secret** visibility, so it is readable
only by an EAS builder, never in the UI or by `env:list`. Note the flag: it is
`--visibility secret`, not `--type secret`, which `--type` rejects.

The mobile app is in the **US** Sentry region (`o299144.ingest.us.sentry.io`)
and the **EU** PostHog region (`eu.i.posthog.com`). That split is correct, not a
mistake to tidy up.

`EXPO_PUBLIC_SENTRY_RELEASE` and `EXPO_PUBLIC_SENTRY_DIST` were **removed** from
the guard: the SDK derives both from the native build, and a hand-pinned value
goes stale on the next `autoIncrement` bump and silently un-symbolicates every
crash. See `apps/mobile/RELEASE.md`. Mobile reports into the **same** Sentry and
PostHog projects as the web app; split them later if the noise gets annoying.

## 3. Create the first store build

No iOS EAS build exists yet.

**TestFlight needs far less than the store does.** Internal TestFlight testing
(your own team, up to 100 testers) requires only a processed build and the
export-compliance answer, which `usesNonExemptEncryption: false` in `app.json`
already supplies. Screenshots, Pricing and Availability, the age rating and
App Review demo credentials are **App Store submission** gates, not TestFlight
ones, and none of them block section 2 → build → `eas submit`. External
TestFlight testers are the exception: those need Beta App Review and beta test
information.

```sh
cd apps/mobile
eas build --profile production --platform ios
eas submit --profile production --platform ios --latest
```

Confirm the build log shows successful Sentry source-map and dSYM uploads.

App Store Connect metadata is **done as of 2026-09-09**: name, subtitle,
promotional text, description, keywords, support/marketing/privacy URLs,
copyright, Sports/Entertainment categories, the age-rating questionnaire (4+)
and the five published privacy nutrition labels. What is still outstanding
there is **screenshots** (one 6.9 inch set, see `STORE.md`), **export
compliance** (answered at submission; `usesNonExemptEncryption` is already
false in `app.json`), **Pricing and Availability**, and **App Review
contact/demo credentials**, which need a real account's password and so must be
entered by a human.
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
