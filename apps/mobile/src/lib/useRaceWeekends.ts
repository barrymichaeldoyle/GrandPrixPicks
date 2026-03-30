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

  const races =
    !convexEnabled || racesQuery === undefined
      ? mockRaceWeekends
      : racesQuery
          .map((race) => mapConvexRaceToWeekend(race))
          .filter((race): race is NonNullable<typeof race> => race !== null);

  return {
    isLoading: convexEnabled && racesQuery === undefined,
    races: races.length > 0 ? races : mockRaceWeekends,
  };
}
