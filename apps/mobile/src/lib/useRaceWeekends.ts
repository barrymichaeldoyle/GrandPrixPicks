import { useQuery } from 'convex/react';
import { useMemo } from 'react';

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

  const races = useMemo(() => {
    if (!convexEnabled || racesQuery === undefined) {
      return mockRaceWeekends;
    }

    const mapped = racesQuery
      .map((race) => mapConvexRaceToWeekend(race))
      .filter((race): race is NonNullable<typeof race> => race !== null);

    return mapped.length > 0 ? mapped : mockRaceWeekends;
  }, [convexEnabled, racesQuery]);

  return {
    isLoading: convexEnabled && racesQuery === undefined,
    races,
  };
}
