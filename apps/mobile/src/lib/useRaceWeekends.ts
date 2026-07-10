import { useQuery } from 'convex/react';

import { mockRaceWeekends } from '../data/mockRaces';
import { api } from '../integrations/convex/api';
import { useMobileConfig } from '../providers/mobile-config';
import { mapConvexRaceToWeekend } from './races';

export function useRaceWeekends() {
  const { convexEnabled } = useMobileConfig();
  const racesQuery = useQuery(
    api.races.listRaces,
    convexEnabled ? { season: 2026 } : 'skip',
  );

  // Mock data exists only for the unconfigured-Convex dev shell. A connected
  // app must never show it — while loading, return nothing and let callers
  // render their loading state.
  const races = !convexEnabled
    ? mockRaceWeekends
    : (racesQuery ?? [])
        .map((race) => mapConvexRaceToWeekend(race))
        .filter((race): race is NonNullable<typeof race> => race !== null);

  return {
    isLoading: convexEnabled && racesQuery === undefined,
    races,
  };
}
