/**
 * `fetch` that gives up after `ms`.
 *
 * `AbortSignal.timeout()` does the same and Convex supports it, but backend
 * source is also typechecked by the mobile app, through the generated `api`
 * types, against React Native's globals, which do not declare it. That broke
 * the mobile typecheck in CI. An `AbortController` and a timer type-check in
 * both places, and clearing the timer leaves nothing pending once the request
 * settles.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit,
  ms = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
