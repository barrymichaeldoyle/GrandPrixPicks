import { returnHereAfterAuth } from './returnHereAfterAuth';

/**
 * The options every `clerk.openSignIn()` on the site passes.
 *
 * `withSignUp` turns Clerk's sign-in into its combined sign-in-or-up flow: an
 * email Clerk does not know continues into creating the account instead of
 * failing. Without it, the person who opened the modal by saving their first
 * picks was told "Welcome back! Please sign in to continue", and the one who
 * typed an email got "Couldn't find your account" (422) and left. Every pick
 * save that prompted sign-in between 1 and 11 October 2026 ended in the modal,
 * with no account created (PostHog replays).
 */
export function signInOptions() {
  return { ...returnHereAfterAuth(), withSignUp: true };
}
