import type { Id } from '@convex-generated/dataModel';
import { act, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { H2HDuelPicker } from './H2HDuelPicker';
import type { H2HMatchup } from './H2HMatchupGrid';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const matchups: H2HMatchup[] = [
  matchup(
    'matchup-1',
    'McLaren',
    'NOR',
    'Lando Norris',
    'PIA',
    'Oscar Piastri',
  ),
  matchup(
    'matchup-2',
    'Ferrari',
    'LEC',
    'Charles Leclerc',
    'HAM',
    'Lewis Hamilton',
  ),
];

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  vi.useRealTimers();
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe('H2HDuelPicker', () => {
  it('shows one duel at a time and advances after a pick', () => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    function Harness() {
      const [selections, setSelections] = useState<
        Record<string, Id<'drivers'>>
      >({});
      return (
        <H2HDuelPicker
          matchups={matchups}
          selections={selections}
          onSelect={(matchupId, driverId) =>
            setSelections((current) => ({
              ...current,
              [matchupId]: driverId,
            }))
          }
        />
      );
    }

    act(() => root?.render(<Harness />));

    expect(container.textContent).toContain('McLaren');
    expect(container.textContent).not.toContain('Ferrari');
    expect(
      container.querySelector('[data-testid="h2h-duel-progress"]')?.textContent,
    ).toBe('0/2');

    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Pick Lando Norris"]')
        ?.click();
      vi.runAllTimers();
    });

    expect(container.textContent).toContain('Teammate battle 2 of 2');
    expect(
      container.querySelector('[data-testid="h2h-duel-progress"]')?.textContent,
    ).toBe('1/2');
  });

  it('moves to restored draft progress after selections hydrate', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const firstSelection = {
      [matchups[0]._id]: matchups[0].driver1._id,
    };

    act(() =>
      root?.render(
        <H2HDuelPicker
          matchups={matchups}
          selections={{}}
          onSelect={() => undefined}
        />,
      ),
    );
    act(() =>
      root?.render(
        <H2HDuelPicker
          matchups={matchups}
          selections={firstSelection}
          onSelect={() => undefined}
        />,
      ),
    );

    expect(container.textContent).toContain('Teammate battle 2 of 2');

    act(() =>
      root?.render(
        <H2HDuelPicker
          matchups={matchups}
          selections={{
            ...firstSelection,
            [matchups[1]._id]: matchups[1].driver2._id,
          }}
          onSelect={() => undefined}
        />,
      ),
    );

    expect(container.textContent).toContain('Teammate battle 2 of 2');
    expect(container.textContent).toContain('All battles called');
  });
});

function matchup(
  matchupId: string,
  team: string,
  driver1Code: string,
  driver1Name: string,
  driver2Code: string,
  driver2Name: string,
): H2HMatchup {
  return {
    _id: matchupId as Id<'h2hMatchups'>,
    team,
    driver1: {
      _id: `${matchupId}-driver-1` as Id<'drivers'>,
      code: driver1Code,
      displayName: driver1Name,
      team,
    },
    driver2: {
      _id: `${matchupId}-driver-2` as Id<'drivers'>,
      code: driver2Code,
      displayName: driver2Name,
      team,
    },
  };
}
