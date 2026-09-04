import type { Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PracticeResults } from '@/lib/practiceSessions';

import { DashboardPracticeCard } from './DashboardPracticeCard';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// The live query stays unanswered in these tests, so the card renders from the
// SSR seed — which is also the state the server HTML is in.
vi.mock('@/integrations/convex/query', () => ({
  useQuery: () => undefined,
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

const RACE_ID = 'race_1' as Id<'races'>;

function session(
  sessionType: 'fp1' | 'fp2' | 'fp3',
  driverCount: number,
): PracticeResults[number] {
  return {
    sessionType,
    publishedAt: 1_000,
    entries: Array.from({ length: driverCount }, (_, index) => ({
      driverNumber: index + 1,
      code: `D${String(index + 1).padStart(2, '0')}`,
      displayName: `Driver ${index + 1} (${sessionType})`,
      team: 'McLaren',
      position: index + 1,
      bestLapSeconds: 80 + index,
      gapToLeaderSeconds: index === 0 ? undefined : index,
      lapCount: 20,
      isReserve: false,
    })),
  };
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
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

describe('DashboardPracticeCard', () => {
  it("shows every published session's top six", () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="bahrain-2026"
        initialResults={[session('fp2', 20), session('fp1', 20)]}
      />,
    );

    // The heading leads on the newest session; both columns are on the card.
    expect(view.textContent).toContain('FP2 \u00b7 Driver 1 (fp2) fastest');
    const columns = [
      ...view.querySelectorAll('[data-testid="dashboard-practice"] p'),
    ];
    expect(columns.map((column) => column.textContent)).toEqual(['FP1', 'FP2']);
  });

  it('stops at the top six, so the card never carries the whole field', () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="bahrain-2026"
        initialResults={[session('fp1', 20)]}
      />,
    );

    expect(view.textContent).toContain('D06');
    expect(view.textContent).not.toContain('D07');
    expect(view.textContent).toContain('Full lap times and gaps');
  });

  it('renders nothing while no practice session is published', () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="bahrain-2026"
        initialResults={[]}
      />,
    );

    expect(view.querySelector('[data-testid="dashboard-practice"]')).toBeNull();
  });
});
