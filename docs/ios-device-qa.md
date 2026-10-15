# iOS submission device checks

Prepared 2026-10-15. Run against the final TestFlight build on a physical
iPhone connected to the production services. Record the build, iOS version,
device, date, and any failed step. Simulator and unit tests do not complete
these checks.

## Before testing

- [ ] Install the latest candidate from TestFlight and record its build number.
- [ ] Use a disposable account for deletion. Keep the App Review account intact.
- [ ] Check fresh-install and returning-user behaviour. Reinstalling alone may
      preserve the Clerk session in the iOS keychain and notification settings.

## Sign-in and picks

- [ ] Browse Home, Leaderboard, and More > Races while signed out.
- [ ] Sign in with Apple. Cancel once, retry, and complete sign-in; verify Home
      loads saved picks and the correct profile. Repeat with Google.
- [ ] Save five unique drivers for an open weekend, then complete team-mate
      picks. Relaunch and verify they persist.
- [ ] Edit one open session and one team-mate choice; verify other sessions
      retain their saved picks. Locked sessions must remain read-only.
- [ ] Sign out, then sign back in and verify session restoration after a cold
      start. The signed-out app must not retain private cached data.

## Notifications

- [ ] With notification permission undetermined, save a first pick. The app
      offers reminders after the save, rather than at launch.
- [ ] Choose Not now; verify iOS has not shown its permission dialog. Enable
      notifications later from Settings and accept the iOS prompt.
- [ ] Deliver a real production push to this device. Check receipt and tap
      routing with the app open, backgrounded, and terminated.
- [ ] Exercise every enabled category with genuine or controlled events:
      reminders, results, news, social activity, and weekly recap. Check the
      matching in-app notification and destination; avoid sending test pushes
      to other users.
- [ ] Sign out and verify the old account no longer targets this device. Sign
      into a different account and check that its notifications are isolated.

## Account deletion and privacy

- [ ] Delete the disposable account through More > Settings > Delete account.
      Verify sign-out, Clerk removal, and cleanup of its backend data and push
      token. Record this separately from successful removal of the UI session.
- [ ] Decline analytics consent and verify analytics remain disabled. Enable
      it in Settings and check that the preference survives relaunch.
- [ ] Open Support, Privacy policy, and Terms of service from More. Check the
      content, links, browser dismissal, and return to the app.

## Device behaviour

- [ ] Check app icon, splash screen, keyboard avoidance, alerts, and pick
      editor dismissal on the physical device.
- [ ] Complete the main navigation and pick flow with VoiceOver, large text,
      and Reduce Motion. Check labels, focus order, truncation, and scrolling.
- [ ] Go offline, view previously loaded data, and try saving. The app must
      communicate the failure and recover after reconnecting without implying
      an unsuccessful pick was saved.
- [ ] Background and resume around a session lock; edits must follow the
      current server state.
- [ ] Keep the candidate installed through a race weekend and verify locks,
      published scores, and standings. This is our release QA policy, rather
      than a fixed Apple testing-duration requirement.

## App Store Connect

- [ ] Verify the selected review build is the one tested above.
- [ ] Complete free pricing and territory availability.
- [x] Populate the production demo account with Top 5 and all 11 team-mate
      picks for the current round (completed 2026-10-15, Qualifying and Race).
- [ ] Confirm a fresh physical-device sign-in with the supplied credentials
      works without access to the owner's email or phone. The capture session
      used the development build's short-lived Clerk ticket flow.
- [x] Save review contact details and the notes in
      `apps/mobile/APP_REVIEW_NOTES.txt`.
- [x] Upload and verify five screenshots for iPhone Dynamic Island medium
      display (1206 × 2622, opaque RGB PNGs). Assets and ordered placements
      verified on 2026-10-15; see
      `apps/mobile/store-screenshots/iphone-medium/manifest.json`.

Apple's current screenshot requirements:
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
