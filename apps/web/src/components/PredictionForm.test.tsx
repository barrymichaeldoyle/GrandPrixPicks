import { act } from 'react';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { getWebTop5DraftStorageKey } from '@grandprixpicks/shared/picks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc } from '@convex-generated/dataModel';
import {
  clearPredictionDraft,
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
/** Driver codes a test wants treated as out of a car for the round. */
const notRacingCodes = new Set<string>();
const submitSpy = vi.fn().mockResolvedValue(null);
const requestSignInSpy = vi.fn();

vi.mock('canvas-confetti', () => ({ default: () => {} }));
vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

// `m`, not `motion`: the app renders through LazyMotion so the animation
// features load in their own chunk instead of on the critical path.
vi.mock('framer-motion', () => ({
  m: { div: ({ children }: { children?: ReactNode }) => children },
}));

const draggableOnKeyDown = vi.fn((event: Event) => {
  event.preventDefault();
});

vi.mock('@dnd-kit/core', () => ({
  closestCenter: () => {},
  DndContext: ({ children }: { children?: ReactNode }) => children,
  KeyboardSensor: {},
  PointerSensor: {},
  useDraggable: () => ({
    attributes: { role: 'button', tabIndex: 0 },
    listeners: {
      onPointerDown: vi.fn(),
      onKeyDown: draggableOnKeyDown,
    },
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
        // `undefined` for everyone unless a test says otherwise, which is how
        // the real query answers when it is not asked for the non-racers.
        racing: notRacingCodes.has(`D${i}`) ? false : undefined,
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

  it('adds a driver on Enter or Space instead of swallowing the key', async () => {
    clearPredictionDraft(draftKey);
    draggableOnKeyDown.mockClear();
    await act(async () => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    const driver = container.querySelector<HTMLButtonElement>(
      '[data-testid="driver-D0"]',
    );
    expect(driver).not.toBeNull();

    const keys = ['Enter', ' '].map(
      (key) =>
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    act(() => {
      driver?.focus();
      for (const key of keys) {
        driver?.dispatchEvent(key);
      }
    });

    // dnd-kit's draggable keyboard listener is what used to eat these: it
    // preventDefaults Enter and Space to start a drag, so the browser never
    // ran the button's activation behaviour.
    expect(draggableOnKeyDown).not.toHaveBeenCalled();
    expect(keys.map((key) => key.defaultPrevented)).toEqual([false, false]);

    // jsdom stops at the keydown — it does not derive the click a browser
    // fires from Enter on a button — so stand in for that activation and
    // check the pick actually lands.
    act(() => {
      driver?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // The pick landed in slot 1: the pool card carries its position and drops
    // out of the pool. (The picks list itself renders through the `m.div`
    // mock, which forwards children but not test ids.)
    const picked = container.querySelector<HTMLButtonElement>(
      '[data-testid="driver-D0"]',
    );
    expect(picked?.textContent).toContain('P1');
    expect(picked?.textContent).toContain('already picked');
    expect(picked?.disabled).toBe(true);
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

  it('keeps empty-pick guidance beside the heading', async () => {
    clearPredictionDraft(draftKey);
    await act(async () => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    const heading = Array.from(container.querySelectorAll('h3')).find(
      (element) => element.textContent === 'Your Picks',
    );

    expect(heading?.parentElement?.textContent).toContain(
      'Tap drivers to fill your Top 5.',
    );
    expect(
      heading?.parentElement?.nextElementSibling?.textContent,
    ).not.toContain('Tap drivers to fill your Top 5.');
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

  it('flushes an unsaved edit on demand so an exit button cannot outrun the debounce', async () => {
    convexAuth.isAuthenticated = true;
    const actionArea: {
      saveState?: string;
      saveNow?: () => Promise<void>;
    } = {};

    // A saved card whose picks have since been changed: the state a player is
    // in when they reorder and immediately reach for Done.
    await act(async () => {
      root.render(
        <PredictionForm
          raceId={RACE_ID}
          existingPicks={[...DRIVER_IDS].reverse()}
          renderActionArea={({ saveState, saveNow }) => {
            actionArea.saveState = saveState;
            actionArea.saveNow = saveNow;
            return null;
          }}
        />,
      );
    });

    expect(actionArea.saveState).toBe('unsaved');
    expect(submitSpy).not.toHaveBeenCalled();

    await act(async () => {
      await actionArea.saveNow?.();
    });
    expect(submitSpy).toHaveBeenCalledTimes(1);

    // Nothing to flush once the picks match the server, so leaving a card the
    // player only looked at costs no write.
    await act(async () => {
      root.render(
        <PredictionForm
          raceId={RACE_ID}
          existingPicks={DRIVER_IDS}
          renderActionArea={({ saveState, saveNow }) => {
            actionArea.saveState = saveState;
            actionArea.saveNow = saveNow;
            return null;
          }}
        />,
      );
    });

    expect(actionArea.saveState).toBe('saved');
    await act(async () => {
      await actionArea.saveNow?.();
    });
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('reports whether a save was the first one and whether it was automatic', async () => {
    convexAuth.isAuthenticated = true;
    const onSuccess = vi.fn();

    await act(async () => {
      root.render(
        <PredictionForm
          raceId={RACE_ID}
          existingPicks={[...DRIVER_IDS].reverse()}
          onSuccess={onSuccess}
          renderActionArea={() => null}
        />,
      );
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="remove-pick-1"]')
        ?.click();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>(`[data-testid="driver-D0"]`)
        ?.click();
    });

    // The edit's auto-save is debounced; wait it out rather than flushing, so
    // this asserts what the *background* write reports.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
    });

    expect(onSuccess).toHaveBeenCalledWith({
      autoSaved: true,
      wasFirstSave: false,
    });
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

    expect(draftNoticeTarget.textContent).toContain('We kept your last picks');
    expect(draftNoticeTarget.textContent).toContain('Start over');
    expect(container.textContent).not.toContain("hadn't saved yet");

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

describe('a pick whose driver is no longer racing', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // jsdom has no matchMedia; the form reads it for a responsive tooltip.
    // Stubbed here rather than relied on from the block above, so these tests
    // pass or fail on their own.
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
    convexAuth.isAuthenticated = true;
    notRacingCodes.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    notRacingCodes.clear();
  });

  it('keeps all five slots and flags the one who is out', () => {
    // Hadjar's injury: a saved pick names a driver who is no longer in a car.
    // Dropping him would render four slots for five saved picks AND leave the
    // form believing the set was already complete, which disables Save.
    notRacingCodes.add('D1');

    act(() => {
      root.render(
        <PredictionForm raceId={RACE_ID} existingPicks={[...DRIVER_IDS]} />,
      );
    });

    // Five saved picks fill five slots. The failure this guards against is a
    // phantom "Select a driver" slot: the dropped pick still occupies one of
    // the five, so the empty slot can never be filled.
    expect(
      container.querySelectorAll('[data-testid^="remove-pick-"]'),
    ).toHaveLength(5);
    expect(container.textContent).not.toContain('Select a driver');
    expect(
      container.querySelector('[data-testid="pick-not-racing-D1"]'),
    ).not.toBeNull();
  });

  it('does not offer the non-racing driver in the pool', () => {
    notRacingCodes.add('D1');

    act(() => {
      root.render(<PredictionForm raceId={RACE_ID} />);
    });

    expect(container.querySelector('[data-testid="driver-D1"]')).toBeNull();
    expect(container.querySelector('[data-testid="driver-D0"]')).not.toBeNull();
  });
});
