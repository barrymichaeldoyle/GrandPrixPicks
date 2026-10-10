import { useQuery } from '../integrations/convex/query';

import { mockRaceWeekends } from '../data/mockRaces';
import { api } from '../integrations/convex/api';
import { useMobileConfig } from '../providers/mobile-config';
import { mapConvexRaceToWeekend } from './races';

export function useRaceWeekends() {
  const { convexEnabled } = useMobileConfig();
  // The season is the backend's call (`getCurrentSeason`: the next race that
  // has not locked, else the latest), so the app rolls over with the data
  // rather than showing 2026 forever.
  const seasonQuery = useQuery(
    api.races.listCurrentSeason,
    convexEnabled ? {} : 'skip',
  );
  const racesQuery = seasonQuery?.races;

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
