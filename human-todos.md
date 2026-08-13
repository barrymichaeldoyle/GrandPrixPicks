# Getting Grand Prix Picks onto your iPhone via TestFlight

Only the things that need a human. Everything here needs your Apple account,
your dashboards, or your credit card, which is why it isn't automated.

Your Apple Team ID (`LBZ6C9H52C`), bundle ID
(`com.barrymichaeldoyle.grandprixpicks`) and EAS project are already wired up
in `app.json` / `eas.json`. Nothing in the repo needs editing.

---

## Decide first: which backend?

**Just want it on your phone to click around → point it at dev.** You skip
creating a Clerk production instance and a Convex prod auth config entirely.
TestFlight does not care that the keys are test keys.

**Want a real dry run of what users get → point it at prod.** Needs the extra
setup in step 2b.

Start with dev. You can rebuild against prod later.

---

## 1. Apple side (once)

- [ ] **Apple Developer Program membership**, $99/yr, if it has lapsed.
      https://developer.apple.com/account
- [ ] **Create the App Store Connect record.** https://appstoreconnect.apple.com
      → Apps → **+** → New App.

Fill it in as: platform **iOS**, bundle ID
**`com.barrymichaeldoyle.grandprixpicks`** (pick it from the dropdown; if it
isn't listed, create the App ID in the Developer portal first), SKU anything
you like such as `grandprixpicks`.

You do **not** need screenshots, a description or pricing for TestFlight
internal testing. Those are only for actual App Review.

## 2. Environment variables (EAS)

A cloud build has no `.env.local`, so anything you skip ships as `undefined`.

### 2a. The only two that are load-bearing

Without these the app has no backend and no auth. Everything else degrades
quietly and correctly.

```sh
cd apps/mobile

# Using dev (the fast path)
eas env:create --environment production --name EXPO_PUBLIC_CONVEX_URL \
  --value https://fine-greyhound-738.convex.cloud
eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY \
  --value <the pk_test_… from apps/mobile/.env.local>
```

Both values are sitting in `apps/mobile/.env.local` right now. Copy them across.

### 2b. Only if you chose prod

- [ ] Convex prod URL: run `npx convex dashboard --prod` in `apps/backend`, or
      read it off the Convex dashboard. Use it instead of the dev URL above.
- [ ] Clerk **production** instance, and its `pk_live_…` key.
- [ ] In Convex prod, the Clerk JWT issuer must match that production instance,
      or every signed-in request 401s. This is the step people forget.

### 2c. Optional, and genuinely optional

The app checks for these and skips the feature when absent. Skip them for a
first TestFlight build.

| Variable                                                                | Without it         |
| ----------------------------------------------------------------------- | ------------------ |
| `EXPO_PUBLIC_SENTRY_DSN`                                                | no crash reporting |
| `EXPO_PUBLIC_SENTRY_ENV` / `_RELEASE` / `_DIST` / `_TRACES_SAMPLE_RATE` | defaults used      |
| `EXPO_PUBLIC_POSTHOG_KEY` / `_HOST`                                     | no analytics       |

If you do add Sentry, also add the upload secrets, or your first crash arrives
as minified frames and tells you nothing:

```sh
eas env:create --environment production --name SENTRY_AUTH_TOKEN --value <token> --type secret
eas env:create --environment production --name SENTRY_ORG --value <org>
eas env:create --environment production --name SENTRY_PROJECT --value <project>
```

## 3. Build and ship it

```sh
cd apps/mobile
eas build --profile production --platform ios
eas submit --profile production --platform ios --latest
```

- EAS will offer to create the signing credentials for you. Say yes; it handles
  the distribution certificate and provisioning profile.
- `appVersionSource` is `remote`, so EAS owns the build number and increments
  it. You never touch `buildNumber` in `app.json`.
- The build takes ~15-25 min on the free queue.
- After `submit`, the build sits in App Store Connect "Processing" for another
  5-15 min before TestFlight shows it.

## 4. Install it

- [ ] App Store Connect → your app → **TestFlight** → **Internal Testing**
- [ ] Create a group, add yourself (the Apple ID on your developer account)
- [ ] Answer the **export compliance** prompt. The app uses only standard
      HTTPS, so the answer is "No" to the exempt-encryption question.
- [ ] Install TestFlight from the App Store on your phone, accept the invite

## 5. Check these on the real device

Things a simulator cannot tell you:

- [ ] **Push notifications** actually arrive. The entitlement in the repo says
      `aps-environment: development`; EAS should flip it to `production` for a
      store build, but I have not seen it happen, so this is worth confirming
      rather than assuming.
- [ ] **Sign in with Apple** works (simulator Apple auth is unreliable)
- [ ] The **app icon** and splash look right at real density
- [ ] Native surfaces are dark, not light: sign-out and delete-account alerts,
      the keyboard, and the in-app browser behind Support / Privacy / Terms

---

## Bumping the version later

`version` in `app.json` is yours; the build number is not. For 1.0.1, change
`"version": "1.0.0"` and rebuild. Nothing else.

## When you eventually go for review (not needed for TestFlight)

- [ ] Screenshots (6.7" required)
- [ ] Description, keywords, support URL, privacy policy URL
- [ ] Privacy nutrition labels
- [ ] A **demo account** for the reviewer. Less critical now that the app
      browses without an account, but still expected if you want them to see
      the signed-in surfaces.
