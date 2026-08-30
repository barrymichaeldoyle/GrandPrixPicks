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
  fallbackMessage: string,
): UserFacingErrorDetails {
  const message = error instanceof Error ? error.message : String(error ?? '');

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

  // H2H. These have to be matched here, above the Convex-noise branch: every
  // one of them arrives wrapped in "Server Error ... Request ID:", so left to
  // that branch they all collapse into the caller's fallback, which cannot
  // explain that the Top 5 was the missing piece.
  if (message.includes('Submit your top 5 predictions first')) {
    return {
      message:
        'Pick your Top 5 first, then choose who finishes ahead in each team.',
      isGenericFallback: false,
    };
  }
  if (message.includes('H2H predictions are locked for')) {
    return {
      message: 'That session locked before this pick was saved.',
      isGenericFallback: false,
    };
  }
  if (message.includes('All sessions are locked')) {
    return {
      message:
        "Every session this weekend is locked. You can't change picks now.",
      isGenericFallback: false,
    };
  }
  if (
    message.includes('H2H predictions are only open for the next upcoming race')
  ) {
    return {
      message: 'Team-mate picks are only open for the next race.',
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
      message: fallbackMessage,
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
  if (message && message.length <= 80 && !message.includes('\n')) {
    return {
      message,
      isGenericFallback: false,
    };
  }

  return {
    message: fallbackMessage,
    isGenericFallback: true,
  };
}

export function toUserFacingMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return toUserFacingErrorDetails(error, fallbackMessage).message;
}
