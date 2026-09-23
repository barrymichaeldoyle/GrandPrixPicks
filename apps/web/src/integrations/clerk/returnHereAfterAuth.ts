/**
 * Where Clerk sends a reader after an auth step that leaves the page.
 *
 * The modal signs in in place, but a Google account that is new to us goes
 * out to accounts.google.com and comes back through Clerk's sign-up step,
 * which with no redirect configured lands on `/`. A reader who had just built
 * their picks on a race page arrived at the home page instead, pressed Back,
 * and got the browser's cached signed-out copy of the race page: seven Save
 * clicks, seven sign-in prompts (PostHog, 14 September 2026).
 *
 * Fallbacks rather than forces, so a `redirect_url` Clerk was handed
 * explicitly still wins.
 */
export function returnHereAfterAuth(): {
  fallbackRedirectUrl: string;
  signUpFallbackRedirectUrl: string;
} {
  const here = window.location.href;
  return { fallbackRedirectUrl: here, signUpFallbackRedirectUrl: here };
}
