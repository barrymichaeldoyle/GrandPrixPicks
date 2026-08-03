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
  it('marks a picked driver with a surface step and a hairline', () => {
    const grid = renderGrid();
    const cells = [...grid.querySelectorAll('div.rounded-sm.border')];
    const selectedCard = cells.find((cell) =>
      cell.textContent?.includes('Picked'),
    );

    expect(selectedCard).not.toBeNull();
    expect(selectedCard?.className).toContain('bg-surface-elevated');
    expect(selectedCard?.className).toContain('border-border-strong');
  });

  /*
   * The selected state is deliberately accent-free. A whole card is eleven of
   * these at once, and the accent belongs to the CTA, the save button and the
   * current user's row. Both the stripe and the filled slab were tried here
   * and both turned the grid into a pattern.
   */
  it('spends no accent on the picked container', () => {
    const grid = renderGrid();
    const cells = [...grid.querySelectorAll('div.rounded-sm.border')];
    const selectedCard = cells.find((cell) =>
      cell.textContent?.includes('Picked'),
    );

    expect(selectedCard?.className).not.toContain('gpp-stripe');
    expect(selectedCard?.className).not.toContain('accent');
    expect(selectedCard?.className).not.toContain('ring-');
    expect(grid.querySelector('.gpp-stripe')).toBeNull();
  });

  /* The stripe needed a wider left inset to clear it, so picking a driver
     shifted their name sideways. Both states now share their padding. */
  it('keeps padding identical between picked and unpicked', () => {
    const grid = renderGrid();
    const cells = [...grid.querySelectorAll('div.rounded-sm.border')];
    const picked = cells.find((cell) => cell.textContent?.includes('Picked'));
    const unpicked = cells.find(
      (cell) => !cell.textContent?.includes('Picked'),
    );

    function padding(el?: Element) {
      return (el?.className ?? '')
        .split(' ')
        .filter((token) => /^p[xytblr]?-/.test(token))
        .sort()
        .join(' ');
    }

    expect(padding(picked)).toBe(padding(unpicked));
  });
});
