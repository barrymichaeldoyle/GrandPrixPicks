export const GENERIC_USER_FACING_ERROR_MESSAGE =
  'Something went wrong. Please try again.';

interface UserFacingErrorDetails {
  message: string;
  isGenericFallback: boolean;
}

/**
 * Maps raw server/Convex errors to short, user-friendly messages.
 * Convex errors often include stack traces and request IDs in the message.
 */
export function toUserFacingErrorDetails(
  error: unknown,
): UserFacingErrorDetails {
  const message =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');

  // Auth
  if (message.includes('Not authenticated')) {
    return {
      message: 'Your session may have expired. Please sign in again.',
      isGenericFallback: false,
    };
  }

  // Randomize / predictions
  if (message.includes('All sessions are locked for this race')) {
    return {
      message:
        "All sessions for this race are already locked. You can't change predictions now.",
      isGenericFallback: false,
    };
  }
  if (
    message.includes('Predictions are only open for the next upcoming race')
  ) {
    return {
      message: 'Predictions are only open for the next upcoming race.',
      isGenericFallback: false,
    };
  }
  if (message.includes('Race not found')) {
    return {
      message: "This race couldn't be found.",
      isGenericFallback: false,
    };
  }

  // Convex/network noise → generic
  if (
    message.includes('Server Error') ||
    message.includes('Request ID:') ||
    message.includes('CONVEX ') ||
    message.includes('at requireViewer') ||
    message.includes('at handler')
  ) {
    return {
      message: GENERIC_USER_FACING_ERROR_MESSAGE,
      isGenericFallback: true,
    };
  }
  if (message.includes('Network') || message.includes('fetch')) {
    return {
      message: "We couldn't connect. Check your internet and try again.",
      isGenericFallback: false,
    };
  }

  // Already short and safe
  if (message.length <= 80 && !message.includes('\n')) {
    return {
      message,
      isGenericFallback: false,
    };
  }

  return {
    message: GENERIC_USER_FACING_ERROR_MESSAGE,
    isGenericFallback: true,
  };
}

export function toUserFacingMessage(error: unknown): string {
  return toUserFacingErrorDetails(error).message;
}
