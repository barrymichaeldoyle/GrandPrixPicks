import { getRouteApi } from '@tanstack/react-router';

/** Typed access to the /leagues/$slug route hooks from co-located components. */
export const leagueRouteApi = getRouteApi('/leagues/$slug');
