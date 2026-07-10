import type { SessionType } from '@grandprixpicks/shared/sessions';

export type SessionDenialReason =
  | 'sign_in'
  | 'session_locked'
  | 'race_not_submittable';

export type SessionCapability = {
  sessionType: SessionType;
  /** ms epoch; null when the race has no lock time for this session */
  lockAt: number | null;
  isLocked: boolean;
  hasResult: boolean;
  hasTop5: boolean;
  hasH2H: boolean;
  /** A first/cascade save may write to this session */
  canCreate: boolean;
  /** A targeted edit may write to this session */
  canEdit: boolean;
  /** Why writes are refused; null when canCreate/canEdit are true */
  denialReason: SessionDenialReason | null;
};

/**
 * Server-derived per-session capability, mirroring exactly what the
 * submission mutations enforce: writes require a signed-in viewer, the race
 * to be the next submittable race (`upcoming` with its final lock in the
 * future), and the session's own lock to not have passed. Mutations remain
 * the final authority — this exists so clients don't re-derive the rules.
 *
 * The backend upserts picks, so create and edit share one writability rule;
 * both flags are returned because clients present them differently.
 */
export function deriveSessionCapability(input: {
  sessionType: SessionType;
  lockAt: number | undefined;
  now: number;
  isSignedIn: boolean;
  raceIsSubmittable: boolean;
  hasResult: boolean;
  hasTop5: boolean;
  hasH2H: boolean;
}): SessionCapability {
  const lockAt = typeof input.lockAt === 'number' ? input.lockAt : null;
  const isLocked = lockAt !== null && input.now >= lockAt;

  const writable = input.isSignedIn && input.raceIsSubmittable && !isLocked;
  const denialReason: SessionDenialReason | null = writable
    ? null
    : !input.isSignedIn
      ? 'sign_in'
      : isLocked
        ? 'session_locked'
        : 'race_not_submittable';

  return {
    sessionType: input.sessionType,
    lockAt,
    isLocked,
    hasResult: input.hasResult,
    hasTop5: input.hasTop5,
    hasH2H: input.hasH2H,
    canCreate: writable,
    canEdit: writable,
    denialReason,
  };
}
