import type { Id } from '@convex-generated/dataModel';
import { getWebH2HDraftStorageKey } from '@grandprixpicks/shared/picks';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadPredictionDraft } from '@/lib/predictionDrafts';

import type { H2HMatchup } from './H2HMatchupGrid';
import { H2HPredictionForm } from './H2HPredictionForm';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const RACE_ID = 'race_1' as Id<'races'>;
const captureSpy = vi.fn();

vi.mock('canvas-confetti', () => ({ default: () => {} }));
vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: (...args: unknown[]) => captureSpy(...args),
}));
vi.mock('@/integrations/clerk/runtime-control', () => ({
  useClerkRuntimeControl: () => ({
    active: false,
    openSignInOnMount: false,
    requestSignIn: () => {},
    signInOpened: () => {},
  }),
}));
vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: false }),
  useMutation: () => vi.fn().mockResolvedValue(null),
}));
vi.mock('@convex-generated/api', () => ({
  api: { h2h: { submitH2HPredictions: 'h2h:submitH2HPredictions' } },
}));

function driver(code: string, displayName: string, team: string) {
  return {
    _id: `driver_${code}` as Id<'drivers'>,
    code,
    displayName,
    number: 1,
    team,
  };
}

function duel(id: string, team: string, a: string[], b: string[]) {
  return {
    _id: id as Id<'h2hMatchups'>,
    team,
    driver1: driver(a[0], a[1], team),
    driver2: driver(b[0], b[1], team),
  } as H2HMatchup;
}

const matchups = [
  duel('m_mcl', 'McLaren', ['NOR', 'Lando Norris'], ['PIA', 'Oscar Piastri']),
  duel(
    'm_fer',
    'Ferrari',
    ['LEC', 'Charles Leclerc'],
    ['HAM', 'Lewis Hamilton'],
  ),
  duel(
    'm_mer',
    'Mercedes',
    ['RUS', 'George Russell'],
    ['ANT', 'Kimi Antonelli'],
  ),
];

// Piastri P1 and both Ferraris in the Top 5, Leclerc higher: McLaren and
// Ferrari are answered, Mercedes is the only duel left to ask.
const topFivePositions = {
  driver_PIA: 1,
  driver_HAM: 4,
  driver_LEC: 2,
};

describe('H2HPredictionForm fills duels from the Top 5', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    captureSpy.mockClear();
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  function render() {
    act(() => {
      root.render(
        <H2HPredictionForm
          raceId={RACE_ID}
          matchups={matchups}
          topFivePositions={topFivePositions}
        />,
      );
    });
  }

  function text(testId: string) {
    return container.querySelector(`[data-testid="${testId}"]`)?.textContent;
  }
  function cell(index: number) {
    return container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="h2h-duel-strip"] button',
    )[index];
  }

  it('asks only the duels the Top 5 leaves open', () => {
    render();

    expect(text('h2h-duel-progress')).toBe('Team-mate pick 1 of 1');
    expect(text('h2h-inferred-count')).toBe('2 set from your Top 5');
    expect(container.textContent).toContain('Who finishes ahead?');
    expect(container.textContent).toContain('George Russell');
    expect(cell(0).getAttribute('aria-label')).toContain(
      'Oscar Piastri picked from your Top 5',
    );
    expect(cell(1).getAttribute('aria-label')).toContain(
      'Charles Leclerc picked from your Top 5',
    );
  });

  it('keeps filled-in calls out of the device draft', () => {
    render();
    expect(loadPredictionDraft(getWebH2HDraftStorageKey(RACE_ID))).toBeNull();

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Pick George Russell"]')
        ?.click();
    });

    expect(
      loadPredictionDraft<{ selections: Record<string, string> }>(
        getWebH2HDraftStorageKey(RACE_ID),
      )?.selections,
    ).toEqual({ m_mer: 'driver_RUS' });
    expect(container.textContent).toContain('All matchups selected');
  });

  it('lets a filled-in call be changed, and records the hedge', () => {
    render();

    act(() => cell(0).click());
    expect(text('h2h-duel-progress')).toBe('Set from your Top 5');
    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Pick Lando Norris"]')
        ?.click();
    });

    expect(cell(0).getAttribute('aria-label')).toContain(
      'Lando Norris picked.',
    );
    expect(captureSpy).toHaveBeenCalledWith(
      'h2h_inferred_pick_changed',
      expect.objectContaining({ team: 'McLaren' }),
    );
  });
});
