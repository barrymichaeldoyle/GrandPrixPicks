import { act, useLayoutEffect } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { useRaceWeekendData } from './useRaceWeekendData';

/**
 * Covers one thing: when the race page decides the viewer's picks are still
 * on their way.
 *
 * The gate used to ask `weekendPredictions == null`, which is true both while
 * the subscription is unanswered and once it has answered `null`. `null` is
 * the answer both viewer queries give when Convex cannot see an identity, so
 * a viewer whose Clerk session had signed in but whose Convex socket had not
 * yet carried a token sat under a loader with nothing left to wait for.
 *
 * The hung-token half of that story is `clerkAuth.ts`'s to fix; this half is
 * what happens once Convex has settled on having no identity.
 */

const convexAuth = { isLoading: false, isAuthenticated: true };
let weekendPredictions: unknown = undefined;
let h2hPredictions: unknown = undefined;

// `vite.config.ts` aliases `@/integrations/convex/query` to `convex/react`
// under vitest, so both hooks the module tree reaches for live behind this one
// mock.
vi.mock('convex/react', () => ({
  useConvexAuth: () => convexAuth,
  useQuery: (reference: string) => {
    if (reference === 'predictions:myWeekendPredictions') {
      return weekendPredictions;
    }
    if (reference === 'h2h:myH2HPredictionsForRace') {
      return h2hPredictions;
    }
    return undefined;
  },
}));

vi.mock('@convex-generated/api', () => ({
  api: {
    drivers: { listDrivers: 'drivers:listDrivers' },
    predictions: { myWeekendPredictions: 'predictions:myWeekendPredictions' },
    races: { getPredictionOpenAt: 'races:getPredictionOpenAt' },
    results: {
      getAllResultsForRace: 'results:getAllResultsForRace',
      getEnrichedTop5BySession: 'results:getEnrichedTop5BySession',
      getMyScoresForRace: 'results:getMyScoresForRace',
      getRaceRank: 'results:getRaceRank',
      getResultForRace: 'results:getResultForRace',
    },
    h2h: {
      getMatchupsForSeason: 'h2h:getMatchupsForSeason',
      myH2HPredictionsForRace: 'h2h:myH2HPredictionsForRace',
    },
  },
}));

vi.mock('@/hooks/useMyH2HScoresBySession', () => ({
  toPointsBySession: () => ({ quali: 0, sprint_quali: 0, sprint: 0, race: 0 }),
  useMyH2HScoresBySession: () => ({
    pointsBySession: { quali: 0, sprint_quali: 0, sprint: 0, race: 0 },
    scoresBySession: {},
  }),
}));

vi.mock('@/components/RaceScoreCard/adapters', () => ({
  fromRaceDetail: () => ({}),
}));

vi.mock('@/lib/testing/now', () => ({ useNow: () => 1_756_000_000_000 }));

const race = {
  _id: 'race_1',
  slug: 'italy-2026',
  round: 13,
  season: 2026,
  hasSprint: false,
  status: 'upcoming',
} as never;

let container: HTMLDivElement;
let root: Root;

/**
 * Renders the hook and reports the one field under test. The repo has no
 * `renderHook`, so a probe component writes the value out from a layout
 * effect rather than during render (React Compiler treats the latter as a
 * render-time side effect).
 */
function loadingFor(
  args: { isAuthLoaded?: boolean; isSignedIn?: boolean } = {},
) {
  let observed: boolean | null = null;

  function Probe() {
    const { isViewerPredictionDataLoading } = useRaceWeekendData({
      race,
      isAuthLoaded: args.isAuthLoaded ?? true,
      isSignedIn: args.isSignedIn ?? true,
    });
    useLayoutEffect(() => {
      observed = isViewerPredictionDataLoading;
    });
    return null;
  }

  act(() => {
    root.render(<Probe />);
  });

  return observed;
}

describe('useRaceWeekendData / isViewerPredictionDataLoading', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    convexAuth.isLoading = false;
    convexAuth.isAuthenticated = true;
    weekendPredictions = undefined;
    h2hPredictions = undefined;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('waits while Convex auth is still resolving', () => {
    convexAuth.isLoading = true;
    convexAuth.isAuthenticated = false;
    expect(loadingFor()).toBe(true);
  });

  it('waits while an authenticated viewer’s picks are unanswered', () => {
    weekendPredictions = undefined;
    h2hPredictions = { quali: null };
    expect(loadingFor()).toBe(true);

    weekendPredictions = { predictions: {} };
    h2hPredictions = undefined;
    expect(loadingFor()).toBe(true);
  });

  it('stops waiting once both queries answer', () => {
    weekendPredictions = { predictions: {} };
    h2hPredictions = { quali: null };
    expect(loadingFor()).toBe(false);
  });

  // The regression. Clerk says signed in, Convex says it has no identity, so
  // both viewer queries answer `null` -- an answer, not a pending state. There
  // is nothing further to wait for, and spinning here is the CI hang.
  it('does not wait forever when Convex resolves unauthenticated', () => {
    convexAuth.isLoading = false;
    convexAuth.isAuthenticated = false;
    weekendPredictions = null;
    h2hPredictions = null;
    expect(loadingFor()).toBe(false);
  });

  it('never waits for a signed-out visitor', () => {
    weekendPredictions = null;
    h2hPredictions = null;
    expect(loadingFor({ isSignedIn: false, isAuthLoaded: true })).toBe(false);
  });
});
