import type { Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { H2HMatchupGrid } from './H2HMatchupGrid';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const driver1Id = 'driver-1' as Id<'drivers'>;
const driver2Id = 'driver-2' as Id<'drivers'>;
const matchupId = 'matchup-1' as Id<'h2hMatchups'>;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderGrid() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <H2HMatchupGrid
        matchups={[
          {
            _id: matchupId,
            team: 'McLaren',
            driver1: {
              _id: driver1Id,
              code: 'NOR',
              displayName: 'Lando Norris',
              number: 4,
              team: 'McLaren',
            },
            driver2: {
              _id: driver2Id,
              code: 'PIA',
              displayName: 'Oscar Piastri',
              number: 81,
              team: 'McLaren',
            },
          },
        ]}
        selections={{ [matchupId]: driver1Id }}
        mode="readonly"
      />,
    );
  });

  return container;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
});

describe('H2HMatchupGrid', () => {
  it('uses the timing-sheet stripe treatment for a picked driver', () => {
    const selectedCard = renderGrid().querySelector('.gpp-stripe');

    expect(selectedCard).not.toBeNull();
    expect(selectedCard?.textContent).toContain('Picked');
    expect(selectedCard?.className).toContain('bg-surface-elevated');
    expect(selectedCard?.className).toContain('border-border');
    expect(selectedCard?.className).not.toContain('bg-accent-muted');
    expect(selectedCard?.className).not.toContain('ring-');
  });
});
