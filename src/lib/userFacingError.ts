/**
 * Maps raw server/Convex errors to short, user-friendly messages.
 * Convex errors often include stack traces and request IDs in the message.
 */
export function toUserFacingMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');

  // Auth
  if (message.includes('Not authenticated')) {
    return 'Your session may have expired. Please sign in again.';
  }

  // Randomize / predictions
  if (message.includes('All sessions are locked for this race')) {
    return "All sessions for this race are already locked. You can't change predictions now.";
  }
  if (message.includes('Predictions are only open for the next upcoming race')) {
    return "Predictions are only open for the next upcoming race.";
  }
  if (message.includes('Race not found')) {
    return "This race couldn't be found.";
  }

  // Convex/network noise → generic
  if (
    message.includes('Server Error') ||
    message.includes('Request ID:') ||
    message.includes('CONVEX ') ||
    message.includes('at requireViewer') ||
    message.includes('at handler')
  ) {
    return 'Something went wrong. Please try again.';
  }
  if (message.includes('Network') || message.includes('fetch')) {
    return "We couldn't connect. Check your internet and try again.";
  }

  // Already short and safe
  if (message.length <= 80 && !message.includes('\n')) {
    return message;
  }

  return 'Something went wrong. Please try again.';
}
