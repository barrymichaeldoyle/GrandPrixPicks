import type { Doc, Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingPicks } from './LandingPicks';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const RACE_ID = 'race_1' as Id<'races'>;
const DRIVER_IDS = ['d0', 'd1', 'd2', 'd3', 'd4'] as Id<'drivers'>[];
const DRIVERS = DRIVER_IDS.map(
  (id, index) =>
    ({
      _id: id,
      code: `D${index}`,
      displayName: `Driver ${index}`,
      team: 'McLaren',
      number: index + 1,
    }) as Doc<'drivers'>,
);

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

vi.mock('@convex-generated/api', () => ({
  api: { h2h: { getMatchupsForSeason: 'h2h:getMatchupsForSeason' } },
}));

vi.mock('convex/react', () => ({
  useQuery: (_ref: string, args: unknown) =>
    args === 'skip' ? undefined : [{ _id: 'matchup_1' }],
}));

vi.mock('./LandingTopFivePicker', () => ({
  LandingTopFivePicker: ({
    onComplete,
    onContinue,
    onCompletionStateChange,
    onPicksChange,
    draftNoticeTarget,
  }: {
    onComplete: () => void;
    onContinue: () => void;
    onCompletionStateChange: (complete: boolean) => void;
    onPicksChange: (picks: Id<'drivers'>[]) => void;
    draftNoticeTarget?: HTMLElement | null;
  }) => (
    <div
      data-testid="top5-step"
      data-has-draft-target={String(Boolean(draftNoticeTarget))}
    >
      <button type="button" onClick={onContinue}>
        Attempt early continue
      </button>
      <button
        type="button"
        onClick={() => {
          onPicksChange(DRIVER_IDS);
          onCompletionStateChange(true);
          onComplete();
        }}
      >
        Complete Top 5
      </button>
      <button type="button" onClick={onContinue}>
        Continue to teammate battles
      </button>
    </div>
  ),
}));

vi.mock('@/components/H2HPredictionForm', () => ({
  H2HPredictionForm: ({
    entryMethod,
    renderSaveWall,
    draftNoticeTarget,
  }: {
    entryMethod: string;
    renderSaveWall: (actions: { lockIn: () => void }) => ReactNode;
    draftNoticeTarget?: HTMLElement | null;
  }) => (
    <div
      data-testid="h2h-step"
      data-entry-method={entryMethod}
      data-has-draft-target={String(Boolean(draftNoticeTarget))}
    >
      {renderSaveWall({ lockIn: () => {} })}
    </div>
  ),
}));

function button(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent === label,
  );
}

describe('LandingPicks linear journey', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.localStorage.clear();
  });

  async function renderJourney() {
    await act(async () => {
      root.render(
        <LandingPicks
          raceId={RACE_ID}
          raceName="Dutch Grand Prix"
          raceSlug="dutch-2026"
          season={2026}
          sessionLabel="Race"
          initialDrivers={DRIVERS}
        />,
      );
    });
  }

  it('keeps H2H unavailable until Top 5 is complete', async () => {
    await renderJourney();

    expect(container.textContent).toContain('Step 1 of 2');
    expect(container.textContent).toContain('Choose your Top 5');
    expect(container.querySelector('[data-testid="h2h-step"]')).toBeNull();
    expect(container.querySelector('[role="tab"]')).toBeNull();
    expect(
      container
        .querySelector('[data-testid="top5-step"]')
        ?.getAttribute('data-has-draft-target'),
    ).toBe('true');

    act(() => button(container, 'Attempt early continue')?.click());
    expect(container.textContent).toContain('Step 1 of 2');
    expect(container.querySelector('[data-testid="h2h-step"]')).toBeNull();

    act(() => button(container, 'Complete Top 5')?.click());
    await act(async () => {
      button(container, 'Continue to teammate battles')?.click();
    });

    expect(container.textContent).toContain('Step 2 of 2');
    expect(container.textContent).toContain('Pick each teammate winner');
    expect(
      container
        .querySelector('[data-testid="h2h-step"]')
        ?.getAttribute('data-entry-method'),
    ).toBe('top5_handoff');
    expect(
      container
        .querySelector('[data-testid="h2h-step"]')
        ?.getAttribute('data-has-draft-target'),
    ).toBe('true');
  });

  it('offers one final sign-in action and allows editing the completed Top 5', async () => {
    await renderJourney();
    act(() => button(container, 'Complete Top 5')?.click());
    await act(async () => {
      button(container, 'Continue to teammate battles')?.click();
    });

    expect(container.textContent).toContain('That’s your prediction card.');
    expect(container.textContent).toContain('Sign in to submit my picks');
    expect(container.textContent).not.toContain('Save my picks');
    expect(container.textContent).not.toContain('I have an account');

    act(() => button(container, 'Edit Top 5')?.click());
    expect(container.textContent).toContain('Step 1 of 2');
    expect(container.textContent).toContain('Choose your Top 5');
    expect(
      container
        .querySelector('[data-testid="h2h-step"]')
        ?.closest('[hidden]'),
    ).not.toBeNull();
  });
});
