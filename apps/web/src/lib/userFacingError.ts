import { ConvexError } from 'convex/values';

import type { UserFacingErrorDetails } from '@grandprixpicks/shared/userFacingError';
import { userFacingErrorFromMessage } from '@grandprixpicks/shared/userFacingError';

/**
 * Maps raw server/Convex errors to short, user-friendly messages.
 * Convex errors often include stack traces and request IDs in the message.
 */
export function toUserFacingErrorDetails(
  error: unknown,
  fallbackMessage: string,
): UserFacingErrorDetails {
  // An expected rejection arrives as a ConvexError. Its data holds the plain
  // server message, without the stack trace the client adds to `message`.
  const message =
    error instanceof ConvexError && typeof error.data === 'string'
      ? error.data
      : error instanceof Error
        ? error.message
        : String(error ?? '');
  return userFacingErrorFromMessage(message, fallbackMessage);
}

export function toUserFacingMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return toUserFacingErrorDetails(error, fallbackMessage).message;
}
