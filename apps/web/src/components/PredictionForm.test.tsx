import { act } from 'react';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { getWebTop5DraftStorageKey } from '@grandprixpicks/shared/picks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc } from '@convex-generated/dataModel';
import {
  clearPendingSubmit,
  hasPendingSubmit,
  savePredictionDraft,
} from '@/lib/predictionDrafts';

import { PredictionForm } from './PredictionForm';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const RACE_ID = 'race_1' as Doc<'races'>['_id'];
const DRIVER_IDS = ['d0', 'd1', 'd2', 'd3', 'd4'] as Doc<'drivers'>['_id'][];

// Controllable Convex auth state — flipped to authenticated to simulate the
// moment sign-in completes.
const convexAuth = { isLoading: false, isAuthenticated: false };
const submitSpy = vi.fn().mockResolvedValue(null);
const openSignInSpy = vi.fn();

vi.mock('canvas-confetti', () => ({ default: () => {} }));
vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children?: ReactNode }) => children },
}));

vi.mock('@dnd-kit/core', () => ({
  closestCenter: () => {},
  DndContext: ({ children }: { children?: ReactNode }) => children,
  KeyboardSensor: {},
  PointerSensor: {},
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: <T,>(items: T[]) => items,
  SortableContext: ({ children }: { children?: ReactNode }) => children,
  sortableKeyboardCoordinates: () => {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

vi.mock('@tanstack/react-router', () => ({
  useBlocker: () => ({ status: 'idle', proceed: () => {}, reset: () => {} }),
}));

vi.mock('@clerk/react', () => ({
  useClerk: () => ({ openSignIn: openSignInSpy }),
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => convexAuth,
  useMutation: () => submitSpy,
  useQuery: (ref: string) => {
    if (ref === 'races:getRace' || ref === 'races:getNextRace') {
      return {
        _id: RACE_ID,
        slug: 'spanish-grand-prix',
        status: 'upcoming',
        hasSprint: false,
        raceStartAt: Date.now() + 5 * 86_400_000,
        predictionLockAt: Date.now() + 5 * 86_400_000,
      };
    }
    if (ref === 'drivers:listDrivers') {
      return DRIVER_IDS.map((id, i) => ({
        _id: id,
        code: `D${i}`,
        displayName: `Driver ${i}`,
        team: 'Team',
        number: i + 1,
      }));
    }
    return undefined;
  },
}));

vi.mock('@convex-generated/api', () => ({
  api: {
    drivers: { listDrivers: 'drivers:listDrivers' },
    races: { getRace: 'races:getRace', getNextRace: 'races:getNextRace' },
    predictions: { submitPrediction: 'predictions:submitPrediction' },
  },
}));

function submitButton(container: HTMLElement) {
  return container.querySelector<HTMLButtonElement>(
    '[data-testid="submit-prediction"]',
  );
}

describe('PredictionForm try-before-signup', () => {
  let container: HTMLDivElement;
  let root: Root;
  const draftKey = getWebTop5DraftStorageKey(RACE_ID);

  beforeEach(() => {
    // jsdom has no matchMedia; the form reads it for a responsive tooltip.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    convexAuth.isLoading = false;
    convexAuth.isAuthenticated = false;
    submitSpy.mockClear();
    openSignInSpy.mockClear();
    clearPendingSubmit(draftKey);
    // Seed a complete draft so the form hydrates to 5 picks without needing to
    // simulate drag-and-drop.
    savePredictionDraft(draftKey, {
      picks: DRIVER_IDS,
      updatedAt: new Date().toISOString(),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    clearPendingSubmit(draftKey);
  });

  it('prompts sign-in instead of submitting when signed out, then auto-submits after auth', async () => {
    await act(async () => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    // Signed-out: the button invites sign-in rather than saving directly.
    expect(submitButton(container)?.textContent).toContain(
      'Sign in to save your picks',
    );

    // Clicking opens the Clerk modal, records the pending intent, and does NOT
    // call the mutation yet.
    act(() => {
      submitButton(container)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    expect(openSignInSpy).toHaveBeenCalledTimes(1);
    expect(hasPendingSubmit(draftKey)).toBe(true);
    expect(submitSpy).not.toHaveBeenCalled();

    // Sign-in completes → Convex auth flips → the draft auto-submits once.
    convexAuth.isAuthenticated = true;
    await act(async () => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith({
      raceId: RACE_ID,
      picks: DRIVER_IDS,
      sessionType: undefined,
    });
    expect(hasPendingSubmit(draftKey)).toBe(false);
  });

  it('submits directly (no sign-in prompt) when already authenticated', async () => {
    convexAuth.isAuthenticated = true;
    await act(async () => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    // No pending intent from a prior signed-out attempt, so nothing auto-fires.
    expect(submitSpy).not.toHaveBeenCalled();
    expect(submitButton(container)?.textContent).not.toContain('Sign in');

    act(() => {
      submitButton(container)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });

    expect(openSignInSpy).not.toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });
});
