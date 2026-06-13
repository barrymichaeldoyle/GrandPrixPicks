export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  raceCount?: number;
  isViewer?: boolean;
};

export type CombinedLeaderboardEntry = LeaderboardEntry & {
  top5Points: number;
  h2hPoints: number;
};

export type H2HLeaderboardEntry = LeaderboardEntry & {
  correctPicks: number;
  totalPicks: number;
};

export type TimeScope = 'weekend' | 'season';
export type GameMode = 'combined' | 'top5' | 'h2h';
export type Scope = 'global' | 'following';

export type RaceLeaderboardResult =
  | { status: 'visible'; reason: null; entries: LeaderboardEntry[] }
  | {
      status: 'locked';
      reason: 'sign_in' | 'no_prediction';
      entries: LeaderboardEntry[];
    }
  | undefined;
