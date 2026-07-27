import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc } from '@convex-generated/dataModel';
import type { SessionType } from '@/lib/sessions';

import { H2HResultsSection } from './H2HResultsSection';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Every client subscription is unresolved (returns undefined), simulating the
// SSR / pre-hydration window. The component must fall back to the loader-seeded
// initial props so the finishing order is still rendered.
vi.mock('convex/react', () => ({
  useQuery: () => undefined,
}));

vi.mock('@convex-generated/api', () => ({
  api: {
    users: { me: 'users:me' },
    drivers: { listDrivers: 'drivers:listDrivers' },
    results: {
      getAllResultsForRace: 'results:getAllResultsForRace',
      getResultForRace: 'results:getResultForRace',
      getMyScoresForRace: 'results:getMyScoresForRace',
    },
    h2h: {
      getH2HResultsForRace: 'h2h:getH2HResultsForRace',
      myH2HPredictionsForRace: 'h2h:myH2HPredictionsForRace',
    },
    predictions: { myWeekendPredictions: 'predictions:myWeekendPredictions' },
  },
}));

const ZERO_POINTS = { quali: 0, sprint_quali: 0, sprint: 0, race: 0 };

vi.mock('@/hooks/useMyH2HScoresBySession', () => ({
  toPointsBySession: () => ZERO_POINTS,
  useMyH2HScoresBySession: () => ({
    scoresBySession: {},
    pointsBySession: ZERO_POINTS,
  }),
}));

vi.mock('@/lib/useUserDateFormat', () => ({
  useUserDateFormat: () => ({ formatDate: () => '', formatTime: () => '' }),
}));

vi.mock('@/components/ShareOnXButton', () => ({
  ShareOnXButton: () => null,
}));

vi.mock('@/components/H2HMatchupGrid', () => ({
  H2HMatchupGrid: () => null,
}));

function makeRace(): Doc<'races'> {
  return {
    _id: 'race_1' as Doc<'races'>['_id'],
    _creationTime: 0,
    season: 2026,
    round: 1,
    name: 'Australian Grand Prix',
    slug: 'australia-2026',
    status: 'finished',
    hasSprint: false,
    raceStartAt: 0,
    predictionLockAt: 0,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<'races'>;
}

function makeDrivers(): Doc<'drivers'>[] {
  return [
    { code: 'VER', displayName: 'Max Verstappen', team: 'Red Bull Racing' },
    { code: 'NOR', displayName: 'Lando Norris', team: 'McLaren' },
  ].map(
    (d, i) =>
      ({
        _id: `driver_${i}` as Doc<'drivers'>['_id'],
        _creationTime: i,
        number: i + 1,
        createdAt: 0,
        updatedAt: 0,
        ...d,
      }) as Doc<'drivers'>,
  );
}

function makeInitialResultsBySession() {
  const enrichedClassification = [
    {
      position: 1,
      driverId: 'driver_0' as Doc<'drivers'>['_id'],
      code: 'VER',
      displayName: 'Max Verstappen',
      number: 1,
      team: 'Red Bull Racing',
      nationality: 'NL',
    },
    {
      position: 2,
      driverId: 'driver_1' as Doc<'drivers'>['_id'],
      code: 'NOR',
      displayName: 'Lando Norris',
      number: 4,
      team: 'McLaren',
      nationality: 'GB',
    },
  ];
  return {
    race: { enrichedClassification },
  } as unknown as Parameters<
    typeof H2HResultsSection
  >[0]['initialResultsBySession'];
}

const FULL_GRID_CODES = [
  'VER',
  'NOR',
  'PIA',
  'LEC',
  'HAM',
  'RUS',
  'ANT',
  'SAI',
  'ALB',
  'GAS',
  'COL',
  'OCO',
  'BEA',
  'HUL',
  'BOR',
  'LAW',
  'HAD',
  'ALO',
  'STR',
  'PER',
  'BOT',
  'LIN',
];

/** A full 22-car classification, as a real finished session would produce. */
function makeFullGridResults() {
  const enrichedClassification = FULL_GRID_CODES.map((code, index) => ({
    position: index + 1,
    driverId: `driver_${index}` as Doc<'drivers'>['_id'],
    code,
    displayName: code,
    number: index + 1,
    team: `Team ${Math.floor(index / 2)}`,
    nationality: 'GB',
    status: null,
  }));
  return {
    race: { enrichedClassification },
  } as unknown as Parameters<
    typeof H2HResultsSection
  >[0]['initialResultsBySession'];
}

describe('H2HResultsSection SSR fallback', () => {
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

  it('renders the finishing order from loader-seeded results while subscriptions are unresolved', () => {
    act(() => {
      root.render(
        <H2HResultsSection
          race={makeRace()}
          selectedSession={'race' as SessionType}
          initialDrivers={makeDrivers()}
          initialAvailableSessions={['race'] as SessionType[]}
          initialResultsBySession={makeInitialResultsBySession()}
        />,
      );
    });

    const text = container.textContent ?? '';
    // The actual results table renders (not the "no results yet" placeholder).
    // Signed-out, so the heading is the neutral one and the viewer's own
    // score pills are absent.
    expect(text).toContain('Session Results');
    expect(text).not.toContain('Session Points Breakdown');
    expect(text).toContain('Actual');
    expect(text).not.toContain('No results published yet');
    // Both classified drivers appear.
    expect(text).toContain('VER');
    expect(text).toContain('NOR');
  });

  it('renders the whole classification while the full results table is collapsed', () => {
    act(() => {
      root.render(
        <H2HResultsSection
          race={makeRace()}
          selectedSession={'race' as SessionType}
          initialDrivers={makeDrivers()}
          initialAvailableSessions={['race'] as SessionType[]}
          initialResultsBySession={makeFullGridResults()}
        />,
      );
    });

    const text = container.textContent ?? '';

    // Collapsed by default, so the expand affordance is present...
    expect(text).toContain('Show full results');
    // ...but every driver is still in the DOM. Mounting P7 and back only on
    // expand would leave crawlers indexing a 22-car result as a 6-car one.
    for (const code of FULL_GRID_CODES) {
      expect(text).toContain(code);
    }
  });

  it('marks the collapsed full results table as inert for assistive tech', () => {
    act(() => {
      root.render(
        <H2HResultsSection
          race={makeRace()}
          selectedSession={'race' as SessionType}
          initialDrivers={makeDrivers()}
          initialAvailableSessions={['race'] as SessionType[]}
          initialResultsBySession={makeFullGridResults()}
        />,
      );
    });

    // Present in the DOM for crawlers, but hidden from screen readers and
    // keyboard focus until the reader expands it.
    const collapsed = container.querySelector('[aria-hidden="true"][inert]');
    expect(collapsed).not.toBeNull();
    expect(collapsed?.textContent).toContain('LIN');
  });
});
