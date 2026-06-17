/**
 * True for transient network/fetch failures that are worth retrying — an
 * offline blip, a request dropped by a fast navigation, or the WebKit/iOS
 * "Load failed" / Chromium "Failed to fetch" a flaky mobile connection throws.
 * Application errors (bad args, server exceptions) are *not* transient and
 * should surface immediately.
 */
export function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    error.name === 'TypeError' &&
    (message.includes('load failed') ||
      message.includes('failed to fetch') ||
      message.includes('network'))
  );
}

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  /** Predicate for which errors are worth retrying. */
  shouldRetry?: (error: unknown) => boolean;
};

/**
 * Run `fn`, retrying transient network failures with a small linear backoff.
 * Non-transient errors (or running out of attempts) reject immediately so the
 * caller's error boundary still handles genuine outages.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 2,
    delayMs = 250,
    shouldRetry = isTransientNetworkError,
  }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * (attempt + 1)),
      );
    }
  }
  throw lastError;
}
