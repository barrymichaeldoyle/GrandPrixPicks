import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';

import type { SessionType } from '../lib/sessions';

/**
 * Collapse a per-session score map (e.g. `getMyScoresForRace` or the result
 * of `useMyH2HScoresBySession`) into plain points, defaulting unscored or
 * still-loading sessions to 0.
 */
export function toPointsBySession(
  scores:
    | Partial<Record<SessionType, { points: number } | null | undefined>>
    | null
    | undefined,
): Record<SessionType, number> {
  return {
    quali: scores?.quali?.points ?? 0,
    sprint_quali: scores?.sprint_quali?.points ?? 0,
    sprint: scores?.sprint?.points ?? 0,
    race: scores?.race?.points ?? 0,
  };
}

/**
 * The viewer's H2H score for every session of a race weekend. Convex dedupes
 * the underlying subscriptions, so multiple components can call this for the
 * same race without extra server work. Pass undefined to skip.
 */
export function useMyH2HScoresBySession(raceId: Id<'races'> | undefined) {
  const quali = useQuery(
    api.h2h.getMyH2HScoreForRace,
    raceId ? { raceId, sessionType: 'quali' } : 'skip',
  );
  const sprintQuali = useQuery(
    api.h2h.getMyH2HScoreForRace,
    raceId ? { raceId, sessionType: 'sprint_quali' } : 'skip',
  );
  const sprint = useQuery(
    api.h2h.getMyH2HScoreForRace,
    raceId ? { raceId, sessionType: 'sprint' } : 'skip',
  );
  const race = useQuery(
    api.h2h.getMyH2HScoreForRace,
    raceId ? { raceId, sessionType: 'race' } : 'skip',
  );

  const scoresBySession: Record<SessionType, typeof quali> = {
    quali,
    sprint_quali: sprintQuali,
    sprint,
    race,
  };
  return {
    scoresBySession,
    pointsBySession: toPointsBySession(scoresBySession),
  };
}
