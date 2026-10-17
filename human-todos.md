# iOS release — human handoff

Last audited: 2026-10-15

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
- [x] Configure APNs credentials in EAS. Verified 2026-10-15 with
      `eas credentials --platform ios`, production profile: push key
      `R6TX8G2A5N` is attached to this app. Distribution certificate and
      provisioning profile are active through 2027-09-09. This verifies
      configuration; production push delivery still needs the device checks.

- [x] Native Sign in with Apple in Clerk (2026-10-09). Prod already had the
      iOS app registered (team `LBZ6C9H52C`, bundle
      `com.barrymichaeldoyle.grandprixpicks`); dev got the same registration
      via the Platform API. Both Apple connections now carry that `bundle_id`.
      Not yet proven end to end: that needs a device signed in to an Apple
      Account (section 4). The app falls back to the browser flow if Clerk
      rejects the native token.
- [x] Confirm the dedicated App Review account exists in **production**
      (`apple.review@grandprixpicks.com`) and save its supplied credentials in
      App Review Information. Completed 2026-10-15. The account is verified,
      password-enabled, unlocked, and has no MFA enabled. Credentials are
      stored in App Store Connect, not this repository. Clerk's password
      verification endpoint confirmed the supplied password.
- [x] Populate the review account for the current round. On 2026-10-15,
      Top 5 and all 11 team-mate picks were saved through the app for the
      United States Grand Prix, applying to Qualifying and Race.
- [ ] Test a fresh sign-in on the physical-device candidate, including any
      new-device email challenge (see `apps/mobile/STORE.md`). The simulator
      capture session used a short-lived Clerk ticket, so it does not certify
      the physical-device password flow.

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

Build 1.0.0 (**build 2**) was built and submitted on 2026-09-09 and reached
App Store Connect: EAS submission `69e73a91` at 15:38 UTC finished successfully.
Every `eas submit` of that build since has failed with
`EAS_UPLOAD_TO_ASC_VERSION_DUPLICATE`, which is correct, not a fault: Apple
burns a build number permanently once it is accepted. Check TestFlight before
resubmitting, and rebuild (`autoIncrement` gives you build 3) rather than
retrying the same binary.

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

App Store Connect listing metadata was completed on **2026-09-09**: name, subtitle,
promotional text, description, keywords, support/marketing/privacy URLs,
copyright, Sports/Entertainment categories, the age-rating questionnaire (4+)
and the five published privacy nutrition labels. The 2026-10-15 API audit
confirms build 13 is `VALID` and has `usesNonExemptEncryption: false`, so its
export compliance is already answered. Review contact information supplied
by Barry and the notes from
`apps/mobile/APP_REVIEW_NOTES.txt` are now saved in App Store Connect.
The dedicated demo credentials were saved on 2026-10-15. Five production
screenshots for the required iPhone Dynamic Island medium display have now
been uploaded and verified in the version 1.0.0 draft. Their asset IDs,
placement IDs, hashes, and display order are recorded in
`apps/mobile/store-screenshots/iphone-medium/manifest.json`. Pricing and
availability were configured and read back on 2026-10-15: free in all 175
App Store territories, with availability enabled for new territories too.
The US base price and all 174 automatically equalized prices are zero.
Barry confirmed the initial release will be free, with no launch ads or
in-app subscription; possible later ad removal would use a separate mobile
monthly subscription.
The validated metadata is in `apps/mobile/store.config.json`; screenshots,
review notes, and the data-disclosure inventory are in `apps/mobile/STORE.md`.

Build 1.0.0 (**build 11**) was built from `9590235e` and uploaded to App
Store Connect on 2026-10-09 (EAS build `2525c0d0`, submission `cf3a3176`).
It carries native Sign in with Apple and `expo-crypto`.

Build **12** (from `ee2f16aa`, EAS build `6c5f0bac`, submission `155e5b47`)
replaces it: smooth feed scrolling, no header flashing, and the joined feed.
Build **13** (from `438cf7cb`, EAS build `bb988f67`, submission `b0ada76d`)
replaces 12: no empty Home after sign-in, and the system sign-in prompt names
the app "Grand Prix Picks". Build 14 below supersedes it for device QA.

Draft 6.9-inch screenshots (1320 x 2868, dev data, captured 2026-10-09) are
in `apps/mobile/store-screenshots/`: home, Top 5 editor, season leaderboard,
race result, team-mate pick. Swap in production captures if you prefer real
player names.

Build **14** completed on 2026-10-15 from `de47aa45` to include the mobile
changes after build 13 (season/feed history, live gaps, and results). EAS build:
https://expo.dev/accounts/barrymichaeldoyle/projects/grand-prix-picks/builds/3386f354-c091-416d-827d-a9eac00556eb
The build log confirms source-map and main app dSYM uploads to Sentry. TestFlight
upload was scheduled as submission `b038d5ea-a92e-4c47-9321-8e91473d502b`:
https://expo.dev/accounts/barrymichaeldoyle/projects/grand-prix-picks/submissions/b038d5ea-a92e-4c47-9321-8e91473d502b
Apple processing and device QA remain separate gates. EAS `--what-to-test`
requires the Enterprise plan on this account; upload without that optional
flag and enter beta test notes in App Store Connect instead.
The submission subsequently completed successfully. Apple now reports build
14 as `VALID` with `usesNonExemptEncryption: false`; it is ready for TestFlight
device QA. Build 14 is selected for version 1.0.0 in App Store Connect,
verified by API readback on 2026-10-15. The version remains
`PREPARE_FOR_SUBMISSION`, with manual release selected. Physical-device QA
and the final App Review submission remain outstanding.

The disconnected/loading capture issue was resolved on 2026-10-15 by
restarting the week-old Metro process with a clean cache and reconnecting the
simulator. The final set uses production services and the dedicated review
account. All five images are 1206 × 2622 opaque RGB PNGs and processed
successfully in Apple's asset library. The placements are active, ordered
Top 5 / Home / team-mate pick / leaderboard / result, and the app version
remains `PREPARE_FOR_SUBMISSION`. No App Review submission was made.
The old large-display development screenshots remain unchanged. Local
development environment settings were restored after capturing.

Build 14 is now behind `main`. Commits on 2026-10-17 changed the app's
native dependency set (Expo SDK 57 point releases, `@clerk/expo` 4.12,
`react-native-gesture-handler` 3.3, `react-native-nitro-modules` 0.37,
`@sentry/react-native` 8.31) and fixed the feed's scroll jank, so the next
`eas build --profile production --platform ios` produces **build 15**, which
replaces 14 for device QA and submission. Expo SDK 58 was deliberately not
taken: `@clerk/expo` still declares `expo <58` and NativeWind 5 is a release
candidate that needs a react-native-css release candidate.

## 4. Physical-device TestFlight QA

The simulator cannot certify these:

Use `docs/ios-device-qa.md` for the step-by-step checks and expected results.

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
