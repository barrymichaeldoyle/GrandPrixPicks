import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc } from '@convex-generated/dataModel';

import { SignedOutRacePreview } from './SignedOutRacePreview';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// The real SignInButton needs a ClerkProvider; the preview only relies on it to
// wrap the CTA, so a passthrough is enough to assert the button renders.
vi.mock('@clerk/react', () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

function makeRace(): Doc<'races'> {
  return {
    _id: 'race_1' as Doc<'races'>['_id'],
    _creationTime: 0,
    season: 2026,
    round: 9,
    name: 'Spanish Grand Prix',
    slug: 'spanish-grand-prix',
    status: 'upcoming',
    hasSprint: false,
    raceStartAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
    predictionLockAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
    qualiStartAt: Date.now() + 4 * 24 * 60 * 60 * 1000,
    qualiLockAt: Date.now() + 4 * 24 * 60 * 60 * 1000,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<'races'>;
}

function makeDrivers(): Doc<'drivers'>[] {
  return [
    { code: 'NOR', displayName: 'Lando Norris', team: 'McLaren', number: 4 },
    { code: 'PIA', displayName: 'Oscar Piastri', team: 'McLaren', number: 81 },
    {
      code: 'LEC',
      displayName: 'Charles Leclerc',
      team: 'Ferrari',
      number: 16,
    },
    {
      code: 'VER',
      displayName: 'Max Verstappen',
      team: 'Red Bull Racing',
      number: 1,
    },
  ].map(
    (d, index) =>
      ({
        _id: `driver_${index}` as Doc<'drivers'>['_id'],
        _creationTime: index,
        createdAt: 0,
        updatedAt: 0,
        ...d,
      }) as Doc<'drivers'>,
  );
}

describe('SignedOutRacePreview', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the play-free CTA and race-specific heading', () => {
    act(() => {
      root.render(
        <SignedOutRacePreview
          race={makeRace()}
          drivers={makeDrivers()}
          onStartPicks={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain('Make your free picks');
    expect(container.textContent).toContain(
      'Predict the Spanish Grand Prix top 5',
    );
  });

  it('renders the driver grid grouped by team', () => {
    act(() => {
      root.render(
        <SignedOutRacePreview
          race={makeRace()}
          drivers={makeDrivers()}
          onStartPicks={() => {}}
        />,
      );
    });

    const text = container.textContent ?? '';
    // Teams are grouped, and each appears once as a heading.
    expect(text).toContain('McLaren');
    expect(text).toContain('Ferrari');
    expect(text).toContain('Red Bull Racing');
    // Driver codes are rendered (crawlable content).
    for (const code of ['NOR', 'PIA', 'LEC', 'VER']) {
      expect(text).toContain(code);
    }
  });

  it('omits the driver grid when the roster is empty', () => {
    act(() => {
      root.render(
        <SignedOutRacePreview
          race={makeRace()}
          drivers={[]}
          onStartPicks={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain('Make your free picks');
    expect(container.textContent).not.toContain('Driver Grid');
  });

  it('opens the picker (not a sign-in wall) when the primary CTA is clicked', () => {
    const onStartPicks = vi.fn();
    act(() => {
      root.render(
        <SignedOutRacePreview
          race={makeRace()}
          drivers={makeDrivers()}
          onStartPicks={onStartPicks}
        />,
      );
    });

    const cta = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Make your free picks'),
    );
    expect(cta).toBeDefined();
    act(() => {
      cta?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onStartPicks).toHaveBeenCalledTimes(1);
  });
});
