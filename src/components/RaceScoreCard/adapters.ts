import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { SessionType } from '../../lib/sessions';
import type {
  ClassificationEntry,
  DriverRef,
  PickBreakdown,
  SessionCardData,
  WeekendCardData,
} from './types';

// ───────────────────────── Profile History Adapter ─────────────────────────

type HistoryBreakdownItem = {
  driverId: Id<'drivers'>;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

type HistorySessionData = {
  picks: Array<{ driverId: Id<'drivers'>; code: string }>;
  points: number | null;
  breakdown: Array<HistoryBreakdownItem> | null;
  submittedAt: number;
  isHidden?: boolean;
} | null;

type HistoryWeekend = {
  raceId: Id<'races'>;
  raceSlug: string;
  raceName: string;
  raceRound: number;
  raceStatus: string;
  raceDate: number;
  hasSprint: boolean;
  sessions: Record<SessionType, HistorySessionData>;
  totalPoints: number;
  hasScores: boolean;
  submittedAt: number;
};

type DriverRecord = {
  _id: Id<'drivers'>;
  code: string;
  displayName: string;
  team?: string | null;
  number?: number | null;
  nationality?: string | null;
};

export function fromProfileHistory(
  weekend: HistoryWeekend,
  drivers: Array<DriverRecord> | undefined,
): WeekendCardData {
  const driverMap = new Map(drivers?.map((d) => [d._id, d]));

  const sessionTypes: Array<SessionType> = [
    'quali',
    'sprint_quali',
    'sprint',
    'race',
  ];
  const sessions = {} as Record<SessionType, SessionCardData | null>;
  let scoredSessionCount = 0;

  for (const st of sessionTypes) {
    const sd = weekend.sessions[st];
    if (!sd) {
      sessions[st] = null;
      continue;
    }

    const hasResults = sd.points !== null;
    if (hasResults) {
      scoredSessionCount++;
    }

    const picks: Array<DriverRef> = sd.picks.map((p) => {
      const driver = driverMap.get(p.driverId);
      return {
        driverId: p.driverId,
        code: p.code,
        displayName: driver?.displayName,
        team: driver?.team,
        number: driver?.number,
        nationality: driver?.nationality,
      };
    });

    const breakdown: Array<PickBreakdown> | null = sd.breakdown
      ? sd.breakdown.map((b) => ({
          driverId: b.driverId,
          predictedPosition: b.predictedPosition,
          actualPosition: b.actualPosition,
          points: b.points,
        }))
      : null;

    sessions[st] = {
      picks,
      points: sd.points,
      breakdown,
      actualTop5: null, // not available from history query
      fullClassification: null, // not available from history query
      isHidden: sd.isHidden ?? false,
      isLocked:
        sd.isHidden === true ||
        sd.points !== null ||
        weekend.raceStatus !== 'upcoming',
      hasResults,
    };
  }

  return {
    raceId: weekend.raceId,
    raceSlug: weekend.raceSlug,
    raceName: weekend.raceName,
    raceRound: weekend.raceRound,
    raceStatus: weekend.raceStatus as 'upcoming' | 'locked' | 'finished',
    raceDate: weekend.raceDate,
    hasSprint: weekend.hasSprint,
    sessions,
    totalPoints: weekend.totalPoints,
    maxPoints: scoredSessionCount * 25,
    scoredSessionCount,
  };
}

// ───────────────────────── Race Detail Adapter ─────────────────────────

type ScoreBreakdownItem = {
  driverId: Id<'drivers'>;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
  code: string;
  displayName: string;
};

type SessionScoreData = {
  points: number;
  enrichedBreakdown: Array<ScoreBreakdownItem>;
} | null;

type EnrichedTop5Entry = {
  position: number;
  driverId: Id<'drivers'>;
  code: string;
  displayName: string;
  number: number | null;
  team: string | null;
  nationality: string | null;
};

type EnrichedClassificationEntry = {
  position: number;
  driverId: Id<'drivers'>;
  code: string;
  displayName: string;
  number: number | null;
  team: string | null;
  nationality: string | null;
};

type ResultForRace = {
  enrichedClassification: Array<EnrichedClassificationEntry>;
} | null;

export function fromRaceDetail({
  race,
  weekendPredictions,
  scores,
  actualTop5BySession,
  resultsBySession,
  drivers,
  availableSessions,
  predictionOpenAt,
}: {
  race: Doc<'races'>;
  weekendPredictions: {
    predictions: Record<SessionType, Array<Id<'drivers'>> | null>;
  } | null;
  scores: Record<SessionType, SessionScoreData> | null;
  actualTop5BySession: Partial<
    Record<SessionType, Array<EnrichedTop5Entry>>
  > | null;
  resultsBySession: Partial<Record<SessionType, ResultForRace>>;
  drivers: Array<DriverRecord> | undefined;
  availableSessions: Array<SessionType>;
  predictionOpenAt?: number | null;
}): WeekendCardData {
  const driverMap = new Map(drivers?.map((d) => [d._id, d]));
  const now = Date.now();

  const sessionTypes: Array<SessionType> = [
    'quali',
    'sprint_quali',
    'sprint',
    'race',
  ];
  const sessions = {} as Record<SessionType, SessionCardData | null>;
  let scoredSessionCount = 0;
  let totalPoints = 0;

  const lockTimes: Record<SessionType, number | undefined> = {
    quali: race.qualiLockAt,
    sprint_quali: race.sprintQualiLockAt,
    sprint: race.sprintLockAt,
    race: race.predictionLockAt,
  };

  for (const st of sessionTypes) {
    // Skip sessions that don't apply to this weekend
    if (!race.hasSprint && (st === 'sprint_quali' || st === 'sprint')) {
      sessions[st] = null;
      continue;
    }

    const lockTime = lockTimes[st];
    const isLocked = lockTime !== undefined && now >= lockTime;
    const hasResults = availableSessions.includes(st);
    const picksArray = weekendPredictions?.predictions[st] ?? null;
    const sessionScore = scores?.[st] ?? null;

    if (sessionScore) {
      scoredSessionCount++;
      totalPoints += sessionScore.points;
    }

    const picks: Array<DriverRef> = picksArray
      ? picksArray.map((driverId) => {
          const driver = driverMap.get(driverId);
          return {
            driverId,
            code: driver?.code ?? '???',
            displayName: driver?.displayName,
            team: driver?.team,
            number: driver?.number,
            nationality: driver?.nationality,
          };
        })
      : [];

    const breakdown: Array<PickBreakdown> | null =
      sessionScore?.enrichedBreakdown
        ? sessionScore.enrichedBreakdown.map((b) => ({
            driverId: b.driverId,
            predictedPosition: b.predictedPosition,
            actualPosition: b.actualPosition,
            points: b.points,
          }))
        : null;

    const top5Data = actualTop5BySession?.[st];
    const actualTop5: Array<DriverRef> | null = top5Data
      ? top5Data.map((e) => ({
          driverId: e.driverId,
          code: e.code,
          displayName: e.displayName,
          team: e.team,
          number: e.number,
          nationality: e.nationality,
        }))
      : null;

    const resultData = resultsBySession[st];
    const fullClassification: Array<ClassificationEntry> | null =
      resultData?.enrichedClassification
        ? resultData.enrichedClassification.map((e) => ({
            position: e.position,
            driverId: e.driverId,
            code: e.code,
            displayName: e.displayName,
            team: e.team,
            number: e.number,
            nationality: e.nationality,
          }))
        : null;

    sessions[st] = {
      picks,
      points: sessionScore?.points ?? null,
      breakdown,
      actualTop5,
      fullClassification,
      isHidden: false,
      isLocked,
      hasResults,
    };
  }

  return {
    raceId: race._id,
    raceSlug: race.slug,
    raceName: race.name,
    raceRound: race.round,
    raceStatus: race.status as 'upcoming' | 'locked' | 'finished',
    raceDate: race.raceStartAt,
    hasSprint: race.hasSprint ?? false,
    sessions,
    totalPoints,
    maxPoints: scoredSessionCount * 25,
    scoredSessionCount,
    predictionOpenAt,
  };
}
