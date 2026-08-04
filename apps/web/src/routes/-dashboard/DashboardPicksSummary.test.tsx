import type { Doc, Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { H2HMatchup } from '@/components/H2HMatchupGrid';

import { DashboardPicksSummary } from './DashboardPicksSummary';
import type { DashboardSessionState } from './dashboardState';

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

const MATCHUPS: H2HMatchup[] = [
  {
    _id: 'matchup_1' as H2HMatchup['_id'],
    team: 'McLaren',
    driver1: { _id: DRIVER_IDS[0], code: 'D0', displayName: 'Driver 0' },
    driver2: { _id: DRIVER_IDS[1], code: 'D1', displayName: 'Driver 1' },
  },
  {
    _id: 'matchup_2' as H2HMatchup['_id'],
    team: 'Ferrari',
    driver1: { _id: DRIVER_IDS[2], code: 'D2', displayName: 'Driver 2' },
    driver2: { _id: DRIVER_IDS[3], code: 'D3', displayName: 'Driver 3' },
  },
];

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('@/components/PredictionForm', () => ({
  PredictionForm: ({ sessionType }: { sessionType?: string }) => (
    <div data-testid="top5-form" data-session={sessionType ?? 'cascade'} />
  ),
}));

vi.mock('@/components/H2HPredictionForm', () => ({
  H2HPredictionForm: ({ sessionType }: { sessionType?: string }) => (
    <div data-testid="h2h-form" data-session={sessionType ?? 'cascade'} />
  ),
}));

vi.mock('@/components/H2HDuelFocusModal', () => ({
  H2HDuelFocusModal: ({
    open,
    matchup,
    sessionType,
  }: {
    open: boolean;
    matchup: H2HMatchup | null;
    sessionType: string;
  }) =>
    open && matchup ? (
      <div
        data-testid="duel-modal"
        data-matchup={matchup._id}
        data-session={sessionType}
      />
    ) : null,
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function openSession(
  overrides: Partial<DashboardSessionState> = {},
): DashboardSessionState {
  return {
    sessionType: 'quali',
    lockAt: Date.now() + 60_000,
    isLocked: false,
    hasResult: false,
    hasTop5: true,
    hasH2H: true,
    canCreate: false,
    canEdit: true,
    ...overrides,
  };
}

function render(
  props: Partial<Parameters<typeof DashboardPicksSummary>[0]> = {},
) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <DashboardPicksSummary
        raceId={RACE_ID}
        raceSlug="dutch-grand-prix"
        session={openSession()}
        picks={{
          top5: DRIVER_IDS,
          h2h: {
            matchup_1: DRIVER_IDS[0],
            matchup_2: DRIVER_IDS[2],
          },
        }}
        drivers={DRIVERS}
        matchups={MATCHUPS}
        {...props}
      />,
    );
  });
  return container!;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe('DashboardPicksSummary', () => {
  it('shows the saved card for the session without leaving the dashboard', () => {
    const el = render();

    expect(
      el.querySelector('[data-testid="top-five-picks-bar"]'),
    ).not.toBeNull();
    expect(el.querySelector('[data-testid="summary-h2h-bar"]')).not.toBeNull();
    expect(
      el.querySelector('[data-testid="summary-edit-top5"]'),
    ).not.toBeNull();
    expect(el.textContent).toContain('Your qualifying picks');
  });

  it('opens the Top 5 editor scoped to this session only', () => {
    const el = render();

    act(() => {
      el.querySelector<HTMLButtonElement>(
        '[data-testid="summary-edit-top5"]',
      )!.click();
    });

    const form = document.querySelector('[data-testid="top5-form"]');
    expect(form).not.toBeNull();
    expect(form!.getAttribute('data-session')).toBe('quali');
    expect(document.body.textContent).toContain('Qualifying only');
  });

  it('opens a single duel when a team-mate cell is tapped', () => {
    const el = render();

    const cells = el.querySelectorAll<HTMLButtonElement>(
      '[data-testid="summary-h2h-bar"] button',
    );
    expect(cells).toHaveLength(2);

    act(() => cells[1].click());

    const modal = document.querySelector('[data-testid="duel-modal"]');
    expect(modal!.getAttribute('data-matchup')).toBe('matchup_2');
    expect(modal!.getAttribute('data-session')).toBe('quali');
  });

  it('is read-only once the session is locked', () => {
    const el = render({
      session: openSession({ canCreate: false, canEdit: false }),
    });

    expect(el.querySelector('[data-testid="summary-edit-top5"]')).toBeNull();
    expect(
      el.querySelectorAll('[data-testid="summary-h2h-bar"] button'),
    ).toHaveLength(0);
    expect(el.textContent).toContain('Qualifying picks are locked');
  });

  it('prompts for the missing half when team-mate battles are unfinished', () => {
    const el = render({
      session: openSession({ hasH2H: false }),
      picks: { top5: DRIVER_IDS, h2h: { matchup_1: DRIVER_IDS[0] } },
    });

    expect(el.textContent).toContain('1 left to call');
    expect(
      el.querySelector('[data-testid="summary-finish-h2h"]'),
    ).not.toBeNull();
  });
});
