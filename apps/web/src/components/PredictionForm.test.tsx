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
const requestSignInSpy = vi.fn();

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
    attributes: { role: 'button', tabIndex: 0 },
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
  let draftNoticeTarget: HTMLDivElement;
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
    requestSignInSpy.mockClear();
    clearPendingSubmit(draftKey);
    // Seed a complete draft so the form hydrates to 5 picks without needing to
    // simulate drag-and-drop.
    savePredictionDraft(draftKey, {
      picks: DRIVER_IDS,
      updatedAt: new Date().toISOString(),
    });
    container = document.createElement('div');
    draftNoticeTarget = document.createElement('div');
    document.body.appendChild(container);
    document.body.appendChild(draftNoticeTarget);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    draftNoticeTarget.remove();
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
    expect(requestSignInSpy).toHaveBeenCalledTimes(1);
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

    await act(async () => {
      submitButton(container)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(requestSignInSpy).not.toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('exposes one interactive element for each draggable driver', async () => {
    await act(async () => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    const driverButtons = container.querySelectorAll<HTMLElement>(
      'button[data-testid^="driver-"]',
    );
    expect(driverButtons).toHaveLength(DRIVER_IDS.length);
    expect(
      Array.from(driverButtons).every((driver) => driver.tagName === 'BUTTON'),
    ).toBe(true);
    expect(container.querySelector('[role="button"] button')).toBeNull();
  });

  it('keeps completed-pick guidance compact and beside the heading', async () => {
    await act(async () => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    const heading = Array.from(container.querySelectorAll('h3')).find(
      (element) => element.textContent === 'Your Picks',
    );

    expect(heading?.parentElement?.textContent).toContain(
      'Reorder: drag or use',
    );
    expect(container.textContent).not.toContain(
      'Tap drivers to fill your Top 5.',
    );
  });

  it('lets a guided flow replace the save area with its next action', async () => {
    await act(async () => {
      root.render(
        <PredictionForm
          raceId={RACE_ID}
          renderActionArea={({ complete }) => (
            <button type="button">
              {complete ? 'Continue journey' : 'Not ready'}
            </button>
          )}
        />,
      );
    });

    expect(container.textContent).toContain('Continue journey');
    expect(submitButton(container)).toBeNull();
    expect(container.textContent).not.toContain(
      'You can edit your picks any time before this session starts.',
    );
  });

  it('moves restored-draft status into parent chrome when given a target', async () => {
    await act(async () => {
      root.render(
        <PredictionForm
          raceId={RACE_ID}
          draftNoticeTarget={draftNoticeTarget}
        />,
      );
    });

    expect(draftNoticeTarget.textContent).toContain('Draft restored');
    expect(draftNoticeTarget.textContent).toContain('Discard');
    expect(container.textContent).not.toContain('Unsaved draft restored');

    act(() => {
      draftNoticeTarget.querySelector<HTMLButtonElement>('button')?.click();
    });
    expect(draftNoticeTarget.textContent).toBe('');
  });

  it('scrolls to the completed mobile list every time a removed pick is refilled', async () => {
    const onComplete = vi.fn();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = ((query: string) => ({
      matches: query === '(max-width: 1023px)',
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      await act(async () => {
        root.render(
          <PredictionForm
            raceId={RACE_ID}
            mobileActionFirst
            onComplete={onComplete}
          />,
        );
      });

      for (let refill = 0; refill < 2; refill += 1) {
        act(() => {
          container
            .querySelector<HTMLButtonElement>('[data-testid="remove-pick-5"]')
            ?.click();
        });
        act(() => {
          container
            .querySelector<HTMLButtonElement>('[data-testid="driver-D4"]')
            ?.click();
        });
      }

      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      requestAnimationFrame.mockRestore();
    }
  });
});
