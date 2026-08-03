/**
 * Clerk is kept out of the landing page's first paint, so the first Sign in
 * click is a cold start: the local runtime chunk, then `clerk.browser.js` and
 * `ui.browser.js` from the Clerk origin, then `/v1/environment` and
 * `/v1/client`, then the sign-in UI chunks. Serial, and all of it after the
 * click.
 *
 * This fetches the local chunk; mounting the provider (`warmSignIn` in
 * `__root.tsx`) is what gets the remote scripts and the two API calls out of
 * the way. Both run off the same intent signal — see `useClerkWarmHandlers` —
 * and both are idempotent, since the module cache dedupes repeat calls.
 *
 * Note the chunk is not small: it pulls @clerk/react (~93 KB) behind it, which
 * is why nothing preloads it speculatively on page load.
 */
let runtimeModulePromise: Promise<unknown> | null = null;

export function preloadClerkRuntime(): Promise<unknown> {
  runtimeModulePromise ??= import('./runtime-bundle');
  return runtimeModulePromise;
}
