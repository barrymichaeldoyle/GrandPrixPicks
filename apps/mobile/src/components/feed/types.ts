import type { ConvexId } from '../../integrations/convex/api';

type ScoredPick = {
  code: string;
  team?: string;
  displayName?: string;
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
  _id: ConvexId<'feedEvents'>;
  type:
    | 'practice_published'
    | 'score_published'
    | 'results_amended'
    | 'session_locked'
    | 'joined_league'
    | 'streak_milestone'
    | 'lineup_change'
    | 'race_news';
  /** Absent on site-authored lineup changes, news and practice results. */
  userId?: ConvexId<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  raceId?: ConvexId<'races'>;
  sessionType?: string;
  practiceSessionType?: 'fp1' | 'fp2' | 'fp3';
  points?: number;
  raceName?: string;
  raceSlug?: string;
  previousPoints?: number;
  amendmentNote?: string;
  picks?: ScoredPick[];
  h2hScore?: H2HScore | null;
  leagueName?: string;
  leagueSlug?: string;
  streakCount?: number;
  round?: number;
  seatMoves?: {
    team: string;
    outDriverCode?: string;
    outDriverName?: string;
    inDriverCode: string;
    inDriverName: string;
  }[];
  lineupNote?: string;
  newsKey?: string;
  newsHeadline?: string;
  newsBody?: string;
  newsAffectsSessions?: string[];
  newsSourceName?: string;
  newsSourceUrl?: string;
  newsDrivers?: Array<{
    code: string;
    displayName: string;
    team: string | null;
    number: number | null;
    nationality: string | null;
  }>;
  newsStartingGrid?: Array<{
    position: number;
    code: string;
    displayName: string;
    team: string | null;
    note?: string;
  }>;
  createdAt: number;
};
