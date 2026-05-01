import type { Id } from '@convex-generated/dataModel';

import type { SessionType } from '../../lib/sessions';

export type PickBreakdown = {
  driverId: Id<'drivers'>;
  predictedPosition: number; // 1..5
  actualPosition?: number;
  points: number; // 0, 1, 3, or 5
};

export type DriverRef = {
  driverId: Id<'drivers'>;
  code: string;
  displayName?: string;
  team?: string | null;
  number?: number | null;
  nationality?: string | null;
};

export type ClassificationEntry = {
  position: number;
  driverId: Id<'drivers'>;
  code: string;
  displayName: string;
  team: string | null;
  number: number | null;
  nationality: string | null;
};

export type SessionCardData = {
  picks: DriverRef[]; // user's top 5 picks (empty if no prediction)
  points: number | null; // null = not yet scored
  breakdown: PickBreakdown[] | null;
  actualTop5: DriverRef[] | null; // actual classification top 5 (null if no results)
  fullClassification: ClassificationEntry[] | null; // full results (null if no results)
  isHidden: boolean; // true = viewing someone else's unlocked picks
  isLocked: boolean; // true = session has started
  hasResults: boolean; // true = results published
};

type RaceRank = {
  position: number;
  totalPlayers: number;
};

export type WeekendCardData = {
  raceId: Id<'races'>;
  raceSlug: string;
  raceName: string;
  raceRound: number;
  raceStatus: 'upcoming' | 'locked' | 'finished' | 'cancelled';
  raceDate: number;
  hasSprint: boolean;
  sessions: Record<SessionType, SessionCardData | null>;
  totalPoints: number;
  maxPoints: number; // scoredSessions * 25
  scoredSessionCount: number;
  raceRank?: RaceRank | null;
  predictionOpenAt?: number | null;
};
