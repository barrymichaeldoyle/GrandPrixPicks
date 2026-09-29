import { act } from 'react';
import type { Id } from '@convex-generated/dataModel';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupPicksForm } from './RaceWriteupPicksForm';

/**
 * The team-mate battles are offered to signed-in players only.
 *
 * Eleven further decisions in front of a stranger who has not made an account
 * yet is eleven more places to abandon the page, and the Top 5 above them is
 * the conversion this surface exists to win. That trade is a product decision
 * rather than anything the types enforce, so it is pinned here: the duels must
 * stay out of a signed-out visitor's way, and must still be there for someone
 * who has already signed up.
 */

let signedIn = false;

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
  useQuery: (_fn: unknown, args: unknown) => {
    if (args === 'skip') {
      return undefined;
    }
    const shape = args as Record<string, unknown>;
    if ('includeNotRacing' in shape) {
      return [];
    }
    if ('raceId' in shape) {
      return null;
    }
    return [{ _id: 'matchup_1', team: 'Ferrari' }];
  },
}));

vi.mock('@/components/PredictionForm/PredictionForm', () => ({
  PredictionForm: () => <div data-testid="top-five-form" />,
}));

vi.mock('@/components/H2HPredictionForm', () => ({
  H2HPredictionForm: () => <div data-testid="h2h-form" />,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up picks form', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function render() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <RaceWriteupPicksForm
          analyticsSource="predictions_hub"
          phase="preview"
          raceId={'race_1' as Id<'races'>}
          round={13}
          season={2026}
        />,
      );
    });
    return container;
  }

  beforeEach(() => {
    signedIn = false;
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

  it('offers both to a signed-in player', () => {
    signedIn = true;
    const view = render();

    expect(view.querySelector('[data-testid="top-five-form"]')).not.toBeNull();
    expect(view.querySelector('[data-testid="h2h-form"]')).not.toBeNull();
    expect(view.textContent).toContain('Team-mate battles');
  });
});
