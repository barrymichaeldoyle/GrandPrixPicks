import type { SessionType } from '@grandprixpicks/shared/sessions';
import type { ConvexDoc, ConvexId } from '../../integrations/convex/api';

export const MAX_TOP5 = 5;
export const CASCADE_DRAFT_SESSION: SessionType = 'race';
/**
 * Grace period after the last H2H matchup is tapped before auto-saving.
 * Top 5 deliberately has no auto-save — order matters there, so completion
 * doesn't mean the user is done (see Top5Editor).
 */
export const H2H_AUTO_SAVE_DELAY_MS = 1200;

export type RaceDoc = ConvexDoc<'races'>;
export type DriverId = ConvexId<'drivers'>;
export type DriverDoc = ConvexDoc<'drivers'>;

/** Server-derived per-session capability from races.getCurrentWeekend. */
export type SessionCapability = {
  sessionType: SessionType;
  lockAt: number | null;
  isLocked: boolean;
  hasResult: boolean;
  hasTop5: boolean;
  hasH2H: boolean;
  canCreate: boolean;
  canEdit: boolean;
  denialReason: 'sign_in' | 'session_locked' | 'race_not_submittable' | null;
};

export function getSessionLockAt(
  race: RaceDoc,
  session: SessionType,
): number | undefined {
  return {
    quali: race.qualiLockAt,
    sprint_quali: race.sprintQualiLockAt,
    sprint: race.sprintLockAt,
    race: race.predictionLockAt,
  }[session];
}
