import { act } from 'react';
import type { Id } from '@convex-generated/dataModel';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupPicksForm } from './RaceWriteupPicksForm';
import { getFunctionName } from 'convex/server';

/**
 * The team-mate battles are offered to signed-in players only.
 *
 * Eleven further decisions in front of a stranger who has not made an account
 * yet is eleven more places to abandon the page, and the Top 5 above them is
 * the conversion this surface exists to win. That trade is a product decision
 * rather than anything the types enforce, so it is pinned here: the duels must
 * stay out of a signed-out visitor's way, and must still be there for someone
 * who has already signed up.
 *
 * And for them only once the Top 5 has saved, in the same focus takeover the
 * dashboard uses. The page asks for one thing at a time; eleven duels stacked
 * under an empty Top 5 made the picker a screen of controls.
 */

function fiveDrivers(prefix: string) {
  return Array.from({ length: 5 }, (_, index) => `${prefix}_${index + 1}`);
}

let signedIn = false;
let predictions: Record<string, string[]> | null = null;
let h2hPicks: Record<string, Record<string, string>> | null = null;
const top5Form = vi.fn();
const h2hForm = vi.fn();
const duelModal = vi.fn();

vi.mock('@/integrations/clerk/useViewerSession', () => ({
  useViewerSession: () => ({
    isSignedIn: signedIn,
    confirmedSignedIn: signedIn,
  }),
}));

// Every read resolves, and the matchup read resolves to a real pairing, so
// "the duels are missing" can only mean the gate withheld them — never that a
// query was still loading or that the grid came back empty.
vi.mock('@/integrations/convex/query', () => ({
  useQuery: (fn: Parameters<typeof getFunctionName>[0], args: unknown) => {
    if (args === 'skip') {
      return undefined;
    }
    const shape = args as Record<string, unknown>;
    if ('includeNotRacing' in shape) {
      return [];
    }
    if ('raceId' in shape) {
      return getFunctionName(fn) === 'predictions:myWeekendPredictions'
        ? predictions
          ? { predictions }
          : null
        : h2hPicks;
    }
    return [
      {
        _id: 'matchup_1',
        team: 'Ferrari',
        driver1: { _id: 'lec', code: 'LEC', displayName: 'Charles Leclerc' },
        driver2: { _id: 'ham', code: 'HAM', displayName: 'Lewis Hamilton' },
      },
    ];
  },
}));

vi.mock('@/components/PredictionForm/PredictionForm', () => ({
  PredictionForm: (props: unknown) => {
    top5Form(props);
    return <div data-testid="top-five-form" />;
  },
}));

vi.mock('@/components/H2HPredictionForm', () => ({
  H2HPredictionForm: (props: unknown) => {
    h2hForm(props);
    return <div data-testid="h2h-form" />;
  },
}));

vi.mock('@/components/H2HDuelFocusModal', () => ({
  H2HDuelFocusModal: (props: { open: boolean }) => {
    duelModal(props);
    return props.open ? <div data-testid="duel-modal" /> : null;
  },
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up picks form', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function element(
    props: Partial<Parameters<typeof RaceWriteupPicksForm>[0]> = {},
  ) {
    return (
      <RaceWriteupPicksForm
        analyticsSource="predictions_hub"
        phase="preview"
        raceId={'race_1' as Id<'races'>}
        round={13}
        season={2026}
        {...props}
      />
    );
  }

  function render(
    props: Partial<Parameters<typeof RaceWriteupPicksForm>[0]> = {},
  ) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(element(props));
    });
    return container;
  }

  /** Re-render the mounted form after a mocked subscription changes. */
  async function rerender(
    props: Partial<Parameters<typeof RaceWriteupPicksForm>[0]> = {},
  ) {
    await act(async () => {
      root?.render(element(props));
    });
  }

  beforeEach(() => {
    signedIn = false;
    predictions = null;
    h2hPicks = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  it('offers the Top 5 but not the team-mate battles to a signed-out visitor', () => {
    signedIn = false;
    const view = render();

    expect(view.querySelector('[data-testid="top-five-form"]')).not.toBeNull();
    expect(view.querySelector('[data-testid="h2h-form"]')).toBeNull();
    expect(view.textContent).not.toContain('Team-mate battles');
  });

  it('withholds the team-mate battles until a signed-in player has saved a Top 5', () => {
    signedIn = true;
    const view = render();

    expect(view.querySelector('[data-testid="top-five-form"]')).not.toBeNull();
    expect(view.textContent).not.toContain('Team-mate battles');
  });

  it('offers the duels as chips and a takeover once the Top 5 has saved', async () => {
    signedIn = true;
    predictions = { quali: fiveDrivers('driver') };
    const view = render();

    expect(view.textContent).toContain('Team-mate battles');
    expect(
      view.querySelector('[data-testid="writeup-h2h-bar"]'),
    ).not.toBeNull();
    expect(view.textContent).toContain('1 left to pick');
    // Not inline: the eleven questions live in the takeover.
    expect(view.querySelector('[data-testid="h2h-form"]')).toBeNull();

    const start = view.querySelector<HTMLButtonElement>(
      '[data-testid="writeup-h2h-start"]',
    );
    expect(start?.textContent).toBe('Make your team-mate picks');
    await act(async () => start?.click());
    expect(document.querySelector('[data-testid="h2h-form"]')).not.toBeNull();
    expect(h2hForm).toHaveBeenLastCalledWith(
      expect.objectContaining({ layout: 'sequential', sessionType: undefined }),
    );
  });

  it('opens the duels the moment the Top 5 saves', async () => {
    signedIn = true;
    render();
    expect(document.querySelector('[data-testid="h2h-form"]')).toBeNull();

    predictions = { quali: fiveDrivers('driver') };
    await rerender();
    expect(document.querySelector('[data-testid="h2h-form"]')).not.toBeNull();
  });

  it('leaves a returning player with their chips rather than a takeover', () => {
    signedIn = true;
    predictions = { quali: fiveDrivers('driver') };
    h2hPicks = { quali: { matchup_1: 'lec' } };
    const view = render();

    expect(view.textContent).toContain('Tap one to change it');
    expect(view.querySelector('[data-testid="writeup-h2h-start"]')).toBeNull();
    expect(document.querySelector('[data-testid="h2h-form"]')).toBeNull();
  });

  it('opens one battle from a chip when the picks are for one session', async () => {
    signedIn = true;
    predictions = { race: fiveDrivers('driver') };
    h2hPicks = { race: { matchup_1: 'lec' } };
    const view = render({ phase: 'race-picks' });

    const chip = view.querySelector<HTMLButtonElement>(
      '[data-testid="writeup-h2h-bar"] button',
    );
    await act(async () => chip?.click());
    expect(duelModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        sessionType: 'race',
        selectedDriverId: 'lec',
      }),
    );
  });

  it('restores separate sprint picks and keeps the Top 5 and duels on the same session', async () => {
    signedIn = true;
    predictions = {
      sprint_quali: fiveDrivers('driver_sq'),
      sprint: fiveDrivers('driver_s'),
      quali: fiveDrivers('driver_q'),
      race: fiveDrivers('driver_r'),
    };
    h2hPicks = {
      sprint_quali: { matchup_1: 'lec' },
      sprint: { matchup_1: 'ham' },
    };
    const view = render({ hasSprint: true });
    const select = view.querySelector('select')!;
    expect([...select.options].map((option) => option.value)).toEqual([
      'all',
      'sprint_quali',
      'sprint',
      'quali',
      'race',
    ]);
    expect(top5Form).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sessionType: undefined,
        existingPicks: fiveDrivers('driver_sq'),
      }),
    );

    for (const session of ['sprint_quali', 'sprint', 'race']) {
      act(() => {
        select.value = session;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(top5Form).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sessionType: session,
          existingPicks: predictions[session],
        }),
      );
    }

    // The takeover edits the session the page is on, with that session's
    // saved calls when the card is complete.
    act(() => {
      select.value = 'sprint';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const chip = view.querySelector<HTMLButtonElement>(
      '[data-testid="writeup-h2h-bar"] button',
    );
    await act(async () => chip?.click());
    expect(duelModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        sessionType: 'sprint',
        selectedDriverId: 'ham',
      }),
    );
  });

  it('starts on the race set after qualifying locks', () => {
    const view = render({ hasSprint: true, phase: 'race-picks' });
    expect(view.querySelector('select')!.value).toBe('race');
    expect(view.querySelector('option[value="all"]')).toBeNull();
    expect(top5Form).toHaveBeenLastCalledWith(
      expect.objectContaining({ sessionType: 'race' }),
    );
  });
});
