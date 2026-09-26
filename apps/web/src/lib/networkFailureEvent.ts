import type { ErrorEvent } from '@sentry/tanstackstart-react';

import { isTransientNetworkError } from './retry';

/**
 * What to do with an event whose exception is the browser's own "the request
 * never completed" (`TypeError: Failed to fetch`, WebKit's "Load failed").
 *
 * Matched on the exception and the capture context, never on frame filenames:
 * at `beforeSend` time the frames are bundled paths, and a name like
 * `start-client-core` only exists after Sentry applies source maps server-side.
 * The previous filter matched on exactly that and so never fired (the same trap
 * `staleChunk.ts` records).
 *
 * - `drop` when the browser says it is offline: nothing on our side to fix.
 * - `downgrade` when it reached `ErrorFallback`: the visitor saw the error page,
 *   which is worth a record, but a dropped request is not a fatal defect, and
 *   the fatal level is what the alert rule pages on. A real outage still shows
 *   up here as a spike, and in the prod smoke workflow.
 */
export function classifyNetworkFailureEvent(
  event: Pick<ErrorEvent, 'exception' | 'tags'>,
  online: boolean,
): 'drop' | 'downgrade' | 'keep' {
  const exception = event.exception?.values?.[0];
  const error = Object.assign(new Error(exception?.value ?? ''), {
    name: exception?.type ?? '',
  });
  if (!isTransientNetworkError(error)) {
    return 'keep';
  }
  if (!online) {
    return 'drop';
  }
  return event.tags?.component === 'ErrorFallback' ? 'downgrade' : 'keep';
}
