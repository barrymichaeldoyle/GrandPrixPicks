import type { SessionType } from '@/lib/sessions';

/** Auth state as seen by the race event pages. */
export type ViewerState = {
  isAuthLoaded: boolean;
  isSignedIn: boolean;
};

/** Aggregate prediction/result status for the whole weekend. */
export type WeekendStatus = {
  hasPredictions: boolean;
  hasH2HPredictions: boolean;
  hasPublishedResults: boolean;
  allEventsScored: boolean;
  pointsSoFar: number;
  scoredEventCount: number;
};

/** Session list plus per-session timing/publishing lookups. */
export type SessionSchedule = {
  weekendSessions: readonly SessionType[];
  trackTimeZone: string;
  getStartAt: (session: SessionType) => number;
  getLockAt: (session: SessionType) => number;
  isPublished: (session: SessionType) => boolean;
};

/** Controlled editing state for one picks flow (Top 5 or H2H). */
export type PicksEditingState = {
  session: SessionType | null;
  onSessionChange: (session: SessionType | null) => void;
  hasUnsavedChanges: boolean;
  onDirtyChange: (dirty: boolean) => void;
};
