import type { Id } from '@convex-generated/dataModel';
import { getWebH2HDraftStorageKey } from '@grandprixpicks/shared/picks';
import { act } from 'react';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearPendingSubmit, hasPendingSubmit } from '@/lib/predictionDrafts';

import { H2HPredictionForm } from './H2HPredictionForm';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const RACE_ID = 'race_1' as Id<'races'>;
const MATCHUP_ID = 'matchup_1' as Id<'h2hMatchups'>;
const DRIVER_ID = 'driver_1' as Id<'drivers'>;
const convexAuth = { isLoading: false, isAuthenticated: false };
const submitSpy = vi.fn().mockResolvedValue(null);
const requestSignInSpy = vi.fn();
const saveIntentSpy = vi.fn();

vi.mock('canvas-confetti', () => ({ default: () => {} }));
vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

vi.mock('@/integrations/clerk/runtime-control', () => ({
  useClerkRuntimeControl: () => ({
    active: false,
    openSignInOnMount: false,
    requestSignIn: requestSignInSpy,
    signInOpened: () => {},
  }),
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => convexAuth,
  useMutation: () => submitSpy,
}));

vi.mock('@convex-generated/api', () => ({
  api: {
    h2h: { submitH2HPredictions: 'h2h:submitH2HPredictions' },
  },
}));

vi.mock('./H2HMatchupGrid', () => ({
  H2HMatchupGrid: ({
    matchups,
    onSelect,
    actionCard,
  }: {
    matchups: {
      _id: Id<'h2hMatchups'>;
      driver1: { _id: Id<'drivers'> };
    }[];
    onSelect: (matchupId: Id<'h2hMatchups'>, driverId: Id<'drivers'>) => void;
    actionCard?: ReactNode;
  }) => (
    <div>
      <button
        type="button"
        data-testid="select-h2h-driver"
        onClick={() => onSelect(matchups[0]._id, matchups[0].driver1._id)}
      >
        Pick driver
      </button>
      {actionCard}
    </div>
  ),
}));

vi.mock('./H2HDuelPicker', () => ({
  H2HDuelPicker: ({
    matchups,
    onSelect,
  }: {
    matchups: {
      _id: Id<'h2hMatchups'>;
      driver1: { _id: Id<'drivers'> };
    }[];
    onSelect: (matchupId: Id<'h2hMatchups'>, driverId: Id<'drivers'>) => void;
  }) => (
    <button
      type="button"
      data-testid="select-h2h-driver"
      onClick={() => onSelect(matchups[0]._id, matchups[0].driver1._id)}
    >
      Pick driver
    </button>
  ),
}));

const matchups = [
  {
    _id: MATCHUP_ID,
    team: 'McLaren',
    driver1: {
      _id: DRIVER_ID,
      code: 'NOR',
      displayName: 'Lando Norris',
      number: 4,
      team: 'McLaren',
    },
    driver2: {
      _id: 'driver_2' as Id<'drivers'>,
      code: 'PIA',
      displayName: 'Oscar Piastri',
      number: 81,
      team: 'McLaren',
    },
  },
];

describe('H2HPredictionForm try-before-signup', () => {
  let container: HTMLDivElement;
  let root: Root;
  const draftKey = getWebH2HDraftStorageKey(RACE_ID);

  beforeEach(() => {
    convexAuth.isAuthenticated = false;
    submitSpy.mockClear();
    requestSignInSpy.mockClear();
    saveIntentSpy.mockClear();
    clearPendingSubmit(draftKey);
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    clearPendingSubmit(draftKey);
    window.localStorage.clear();
  });

  it('keeps a signed-out pick as a draft and submits it once after auth', async () => {
    await act(async () => {
      root.render(
        <H2HPredictionForm
          raceId={RACE_ID}
          matchups={matchups}
          onSaveIntent={saveIntentSpy}
        />,
      );
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="select-h2h-driver"]')
        ?.click();
    });

    const saveButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="h2h-submit-button"]',
    );
    expect(saveButton?.textContent).toContain('Sign in to save H2H picks');

    act(() => saveButton?.click());
    expect(saveIntentSpy).toHaveBeenCalledTimes(1);
    expect(requestSignInSpy).toHaveBeenCalledTimes(1);
    expect(hasPendingSubmit(draftKey)).toBe(true);
    expect(submitSpy).not.toHaveBeenCalled();

    convexAuth.isAuthenticated = true;
    await act(async () => {
      root.render(
        <H2HPredictionForm
          raceId={RACE_ID}
          matchups={matchups}
          onSaveIntent={saveIntentSpy}
        />,
      );
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith({
      raceId: RACE_ID,
      picks: [
        {
          matchupId: MATCHUP_ID,
          predictedWinnerId: DRIVER_ID,
        },
      ],
      sessionType: undefined,
    });
    expect(hasPendingSubmit(draftKey)).toBe(false);
  });
});
