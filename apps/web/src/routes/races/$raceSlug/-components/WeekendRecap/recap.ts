import type { WeekendCardData } from '@/components/RaceScoreCard/types';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';

/** The viewer's H2H score for a single session (from `getMyH2HScoreForRace`). */
export type H2HSessionScore =
  | {
      correctPicks: number;
      totalPicks: number;
      points: number;
    }
  | null
  | undefined;

/** The single highest-scoring Top 5 pick of the weekend. */
export type RecapBestCall = {
  code: string;
  team: string | null;
  displayName?: string;
  number?: number | null;
  nationality?: string | null;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
  sessionLabel: string;
};

export type RecapTier = 'stellar' | 'strong' | 'onboard' | 'tough';

export type WeekendRecapData = {
  /** Weekend total across Top 5 + H2H. */
  totalPoints: number;
  top5Points: number;
  h2hPoints: number;
  /** Maximum attainable this weekend (Top 5 + H2H). */
  maxPoints: number;
  rank: { position: number; totalPlayers: number } | null;
  /** Picks that nailed the exact position (5 pts). */
  exactHits: number;
  /** Picks that landed in the actual top 5 (>= 1 pt). */
  closeHits: number;
  /** Total Top 5 picks made across scored sessions. */
  totalPicks: number;
  h2hCorrect: number;
  h2hTotal: number;
  /** Session labels where the viewer scored a perfect 25. */
  perfectSessions: string[];
  bestCall: RecapBestCall | null;
  tier: RecapTier;
};

/**
 * Distil a fully-scored weekend into the handful of headline stats that make
 * the post-race recap feel like a moment. Pure: derives everything from the
 * already-loaded card data + H2H scores, so it needs no extra backend query.
 */
export function deriveWeekendRecap({
  cardData,
  weekendSessions,
  h2hScoresBySession,
}: {
  cardData: WeekendCardData;
  weekendSessions: readonly SessionType[];
  h2hScoresBySession: Partial<Record<SessionType, H2HSessionScore>>;
}): WeekendRecapData {
  let exactHits = 0;
  let closeHits = 0;
  let totalPicks = 0;
  const perfectSessions: string[] = [];
  let bestCall: RecapBestCall | null = null;

  for (const session of weekendSessions) {
    const sessionData = cardData.sessions[session];
    if (
      !sessionData ||
      sessionData.breakdown == null ||
      sessionData.points == null
    ) {
      continue;
    }

    const driverByPredictedPosition = new Map(
      sessionData.picks.map((pick, index) => [index + 1, pick]),
    );

    for (const entry of sessionData.breakdown) {
      totalPicks += 1;
      if (entry.points === 5) {
        exactHits += 1;
      }
      if (entry.points >= 1) {
        closeHits += 1;
      }

      // Best call = most points, then the most ambitious (lowest predicted
      // slot) on a tie, then the earliest session.
      if (entry.points > 0) {
        const isBetter =
          bestCall == null ||
          entry.points > bestCall.points ||
          (entry.points === bestCall.points &&
            entry.predictedPosition < bestCall.predictedPosition);
        const driver = driverByPredictedPosition.get(entry.predictedPosition);
        if (isBetter && driver) {
          bestCall = {
            code: driver.code,
            team: driver.team ?? null,
            displayName: driver.displayName,
            number: driver.number,
            nationality: driver.nationality,
            predictedPosition: entry.predictedPosition,
            actualPosition: entry.actualPosition,
            points: entry.points,
            sessionLabel: SESSION_LABELS[session],
          };
        }
      }
    }

    if (sessionData.points === 25) {
      perfectSessions.push(SESSION_LABELS[session]);
    }
  }

  let h2hCorrect = 0;
  let h2hTotal = 0;
  let h2hPoints = 0;
  for (const session of weekendSessions) {
    const score = h2hScoresBySession[session];
    if (score) {
      h2hCorrect += score.correctPicks;
      h2hTotal += score.totalPicks;
      h2hPoints += score.points;
    }
  }

  const top5Points = cardData.totalPoints;
  const totalPoints = top5Points + h2hPoints;
  const maxPoints = cardData.maxPoints + h2hTotal;

  const top5Ratio =
    cardData.maxPoints > 0 ? top5Points / cardData.maxPoints : 0;
  const tier: RecapTier =
    top5Ratio >= 0.8
      ? 'stellar'
      : top5Ratio >= 0.5
        ? 'strong'
        : top5Ratio > 0
          ? 'onboard'
          : 'tough';

  return {
    totalPoints,
    top5Points,
    h2hPoints,
    maxPoints,
    rank: cardData.raceRank ?? null,
    exactHits,
    closeHits,
    totalPicks,
    h2hCorrect,
    h2hTotal,
    perfectSessions,
    bestCall,
    tier,
  };
}
