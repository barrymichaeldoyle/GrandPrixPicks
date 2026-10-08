import { userFacingErrorFromMessage } from '@grandprixpicks/shared/userFacingError';
import { ConvexError } from 'convex/values';

/**
 * Thrown instead of calling a save mutation while Convex is disconnected.
 *
 * The Convex client queues a mutation it cannot send and replays it on
 * reconnect, which for picks is the blind replay `docs/mobile-mvp.md` rules
 * out: the save sits on "Saving…" and can land after the session has locked.
 * Refusing up front keeps the decision with the player, and the editor keeps
 * their picks as a draft.
 */
export class OfflineSaveError extends Error {
  constructor() {
    super(
      'Your picks weren’t saved: no connection. They’re kept on this phone, so save again when you’re back online.',
    );
    this.name = 'OfflineSaveError';
  }
}

/** A short message for a failed action, in the same words web uses. */
export function userFacingMessage(error: unknown, fallback: string): string {
  if (error instanceof OfflineSaveError) {
    return error.message;
  }
  // A ConvexError's data is the plain server message; `message` adds the
  // client's stack and request id.
  const message =
    error instanceof ConvexError && typeof error.data === 'string'
      ? error.data
      : error instanceof Error
        ? error.message
        : String(error ?? '');
  return userFacingErrorFromMessage(message, fallback).message;
}
