import type { Id } from '@convex-generated/dataModel';

export type ScoredPick = {
  code: string;
  team?: string;
  displayName?: string;
  nationality?: string;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

type H2HScore = {
  correctPicks: number;
  totalPicks: number;
  points: number;
};

export type FeedEvent = {
  _id: Id<'feedEvents'>;
  type:
    | 'practice_published'
    | 'score_published'
    | 'results_amended'
    | 'session_locked'
    | 'joined_league'
    | 'streak_milestone'
    | 'race_news'
    | 'lineup_change';
  /** Absent on site-authored lineup changes, news and practice results. */
  userId?: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  // score_published
  raceId?: Id<'races'>;
  sessionType?: string;
  practiceSessionType?: 'fp1' | 'fp2' | 'fp3';
  points?: number;
  raceName?: string;
  raceSlug?: string;
  season?: number;
  // results_amended
  previousPoints?: number;
  amendmentNote?: string;
  // enriched picks + H2H
  picks?: ScoredPick[];
  h2hScore?: H2HScore | null;
  // joined_league
  leagueId?: Id<'leagues'>;
  leagueName?: string;
  leagueSlug?: string;
  // streak_milestone
  streakCount?: number;
  // lineup_change
  round?: number;
  seatMoves?: {
    team: string;
    outDriverCode?: string;
    outDriverName?: string;
    inDriverCode: string;
    inDriverName: string;
  }[];
  lineupNote?: string;
  // race_news
  newsKey?: string;
  newsHeadline?: string;
  newsBody?: string;
  newsAffectsSessions?: string[];
  newsSourceName?: string;
  newsSourceUrl?: string;
  newsDrivers?: {
    code: string;
    displayName: string;
    team: string | null;
    number: number | null;
    nationality: string | null;
  }[];
  newsStartingGrid?: {
    position: number;
    code: string;
    displayName: string;
    team: string | null;
    note?: string;
  }[];
  createdAt: number;
};

// Feed events carry sessionType as a plain string, so widen the shared map.

type SessionHeaderDriver = {
  code: string;
  displayName: string;
  team?: string;
  nationality?: string;
};

export type SessionHeader = {
  raceName: string;
  sessionType: string;
  raceSlug?: string;
  createdAt?: number;
  top5: SessionHeaderDriver[];
  /** Teammate duels for the session, one entry per team. */
  h2h?: {
    team: string;
    winner: SessionHeaderDriver;
    loser: SessionHeaderDriver;
  }[];
};
