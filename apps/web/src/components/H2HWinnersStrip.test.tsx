import type { Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import type { H2HMatchup } from './H2HMatchupGrid';
import { H2HWinnersStrip } from './H2HWinnersStrip';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const norrisId = 'driver-nor' as Id<'drivers'>;
const piastriId = 'driver-pia' as Id<'drivers'>;
const russellId = 'driver-rus' as Id<'drivers'>;
const antonelliId = 'driver-ant' as Id<'drivers'>;
const mclarenId = 'matchup-mcl' as Id<'h2hMatchups'>;
const mercedesId = 'matchup-mer' as Id<'h2hMatchups'>;

const matchups: H2HMatchup[] = [
  {
    _id: mclarenId,
    team: 'McLaren',
    driver1: {
      _id: norrisId,
      code: 'NOR',
      displayName: 'Lando Norris',
      number: 4,
      team: 'McLaren',
    },
    driver2: {
      _id: piastriId,
      code: 'PIA',
      displayName: 'Oscar Piastri',
      number: 81,
      team: 'McLaren',
    },
  },
  {
    _id: mercedesId,
    team: 'Mercedes',
    driver1: {
      _id: russellId,
      code: 'RUS',
      displayName: 'George Russell',
      number: 63,
      team: 'Mercedes',
    },
    driver2: {
      _id: antonelliId,
      code: 'ANT',
      displayName: 'Kimi Antonelli',
      number: 12,
      team: 'Mercedes',
    },
  },
];

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(selections: Record<string, Id<'drivers'> | undefined>) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <H2HWinnersStrip matchups={matchups} selections={selections} />,
    );
  });

  return container;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container?.remove();
  container = null;
});

describe('H2HWinnersStrip', () => {
  it('renders one entry per matchup, not one per driver', () => {
    const el = render({ [mclarenId]: norrisId, [mercedesId]: antonelliId });

    expect(el.querySelectorAll('li')).toHaveLength(2);
  });

  it('names the picked driver and the one they beat, in that order', () => {
    const el = render({ [mclarenId]: piastriId, [mercedesId]: russellId });
    const [mclaren, mercedes] = [...el.querySelectorAll('li')];

    // The pick is the badge; the driver it beat is the muted code beside it.
    expect(mclaren.textContent).toContain('PIA');
    expect(mclaren.textContent).toContain('NOR');
    expect(mclaren.textContent).toContain(
      'McLaren: you picked Oscar Piastri over Lando Norris',
    );
    expect(mercedes.textContent).toContain(
      'Mercedes: you picked George Russell over Kimi Antonelli',
    );
  });

  it('keeps a slot for a matchup with no pick, so a partial entry reads as partial', () => {
    const el = render({ [mclarenId]: norrisId });
    const [, mercedes] = [...el.querySelectorAll('li')];

    expect(el.querySelectorAll('li')).toHaveLength(2);
    expect(mercedes.textContent).toContain('RUS v ANT');
    expect(mercedes.textContent).toContain('Mercedes: no pick yet');
  });

  it('ignores a selection that names a driver outside the pairing', () => {
    const el = render({ [mclarenId]: russellId });
    const [mclaren] = [...el.querySelectorAll('li')];

    expect(mclaren.textContent).toContain('NOR v PIA');
    expect(mclaren.textContent).toContain('McLaren: no pick yet');
  });
});
