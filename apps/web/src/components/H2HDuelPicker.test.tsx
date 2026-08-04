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
    ).toBe('Team-mate battle 1 of 2');

    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Pick Lando Norris"]')
        ?.click();
      vi.runAllTimers();
    });

    expect(container.textContent).toContain('Team-mate battle 2 of 2');
    expect(
      container.querySelector('[data-testid="h2h-duel-progress"]')?.textContent,
    ).toBe('Team-mate battle 2 of 2');
  });

  it('moves to restored draft progress once the draft hydrates', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const firstSelection = {
      [matchups[0]._id]: matchups[0].driver1._id,
    };

    // The parent mounts the picker before its device draft has loaded, so the
    // catch-up has to wait for that signal rather than for selections to move.
    act(() =>
      root?.render(
        <H2HDuelPicker
          matchups={matchups}
          selections={{}}
          onSelect={() => undefined}
          draftHydrated={false}
        />,
      ),
    );

    expect(container.textContent).toContain('Team-mate battle 1 of 2');

    act(() =>
      root?.render(
        <H2HDuelPicker
          matchups={matchups}
          selections={firstSelection}
          onSelect={() => undefined}
          draftHydrated
        />,
      ),
    );

    expect(container.textContent).toContain('Team-mate battle 2 of 2');
    expect(container.textContent).toContain('Ferrari');
  });

  it('calls onExitPrevious from battle one instead of staying disabled', () => {
    const onExitPrevious = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root?.render(
        <H2HDuelPicker
          matchups={matchups}
          selections={{}}
          onSelect={() => undefined}
          onExitPrevious={onExitPrevious}
        />,
      ),
    );

    act(() => {
      [...(container?.querySelectorAll('button') ?? [])]
        .find((button) => button.textContent?.includes('Previous'))
        ?.click();
    });

    expect(onExitPrevious).toHaveBeenCalledOnce();
  });

  it('lets Previous return to a battle that was already called', () => {
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
    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Pick Lando Norris"]')
        ?.click();
      vi.runAllTimers();
    });

    expect(container.textContent).toContain('Team-mate battle 2 of 2');

    // The re-sync effect used to fire on every index change, so this bounced
    // straight back to battle two and the button was decorative.
    act(() => {
      [...(container?.querySelectorAll('button') ?? [])]
        .find((button) => button.textContent?.includes('Previous'))
        ?.click();
      vi.runAllTimers();
    });

    expect(container.textContent).toContain('Team-mate battle 1 of 2');
    expect(container.textContent).toContain('McLaren');
  });

  it('jumps to any battle from the progress strip', () => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root?.render(
        <H2HDuelPicker
          matchups={matchups}
          selections={{
            [matchups[0]._id]: matchups[0].driver1._id,
            [matchups[1]._id]: matchups[1].driver2._id,
          }}
          onSelect={() => undefined}
        />,
      ),
    );

    // Nothing left to ask, so the duel card is folded away and the strip is
    // the whole card until a cell asks for a battle back.
    expect(container.textContent).toContain('All battles called');
    expect(container.textContent).not.toContain('Who finishes ahead?');

    const strip = container.querySelector('[data-testid="h2h-duel-strip"]');
    expect(strip?.querySelectorAll('button')).toHaveLength(2);
    // The strip doubles as the review surface: each cell names the driver you
    // called, so the calls are readable without walking back through them.
    expect(strip?.textContent).toContain('NOR');
    expect(strip?.textContent).toContain('HAM');

    act(() => {
      strip?.querySelectorAll<HTMLButtonElement>('button')[0]?.click();
      vi.runAllTimers();
    });

    expect(container.textContent).toContain('Team-mate battle 1 of 2');
    expect(container.textContent).toContain('Who finishes ahead?');
  });

  it('folds back to the strip once a re-opened battle is answered', () => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    function Harness() {
      const [selections, setSelections] = useState<
        Record<string, Id<'drivers'>>
      >({
        [matchups[0]._id]: matchups[0].driver1._id,
        [matchups[1]._id]: matchups[1].driver2._id,
      });
      return (
        <H2HDuelPicker
          matchups={matchups}
          selections={selections}
          onSelect={(matchupId, driverId) =>
            setSelections((current) => ({ ...current, [matchupId]: driverId }))
          }
        />
      );
    }

    act(() => root?.render(<Harness />));

    const strip = container.querySelector('[data-testid="h2h-duel-strip"]');
    act(() => {
      strip?.querySelectorAll<HTMLButtonElement>('button')[0]?.click();
      vi.runAllTimers();
    });
    expect(container.textContent).toContain('Who finishes ahead?');

    // Answering the last open question is what closes the card, whether that
    // question was the eleventh or one the player came back to change.
    act(() => {
      const duelButtons = Array.from(
        container?.querySelectorAll<HTMLButtonElement>(
          '[data-testid="h2h-duel-picker"] button',
        ) ?? [],
      );
      duelButtons
        .find((button) => button.textContent?.includes('Piastri'))
        ?.click();
      vi.runAllTimers();
    });

    expect(container.textContent).not.toContain('Who finishes ahead?');
    expect(container.textContent).toContain('All battles called');
  });

  it('keeps a fast re-pick inside the advance window', () => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const selected: Array<string> = [];

    function Harness() {
      const [selections, setSelections] = useState<
        Record<string, Id<'drivers'>>
      >({});
      return (
        <H2HDuelPicker
          matchups={matchups}
          selections={selections}
          onSelect={(matchupId, driverId) => {
            selected.push(driverId);
            setSelections((current) => ({ ...current, [matchupId]: driverId }));
          }}
        />
      );
    }

    act(() => root?.render(<Harness />));

    // Changing your mind before the card advances used to hit a disabled
    // button and be dropped with no feedback at all.
    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Pick Lando Norris"]')
        ?.click();
    });
    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Pick Oscar Piastri"]')
        ?.click();
      vi.runAllTimers();
    });

    expect(selected).toEqual([
      matchups[0].driver1._id,
      matchups[0].driver2._id,
    ]);
    expect(container.textContent).toContain('Team-mate battle 2 of 2');
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
