/**
 * Web's seam onto the shared session vocabulary. Import from here rather than
 * `@grandprixpicks/shared/sessions` directly, so web-only session helpers have
 * somewhere to live without a churn of import rewrites. `lib/lock.ts` is the
 * same pattern.
 */
export type { SessionType } from '@grandprixpicks/shared/sessions';
export {
  getMissingEarlierSessions,
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_FULL,
  SESSION_LABELS_SHORT,
} from '@grandprixpicks/shared/sessions';
