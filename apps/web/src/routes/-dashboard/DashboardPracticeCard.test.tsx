import type { Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PracticeResults } from './DashboardPracticeCard';
import {
  DashboardPracticeCard,
  latestPracticeResult,
} from './DashboardPracticeCard';

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

function expandButton(view: HTMLDivElement) {
  return view.querySelector('button[aria-expanded]');
}

function remainingRegion(view: HTMLDivElement) {
  return view.querySelector('[role="region"]');
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
});

describe('latestPracticeResult', () => {
  it('prefers the newest session regardless of array order', () => {
    const results = [
      session('fp1', 20),
      session('fp3', 20),
      session('fp2', 20),
    ];
    expect(latestPracticeResult(results)?.sessionType).toBe('fp3');
  });

  it('returns null when nothing has been published', () => {
    expect(latestPracticeResult([])).toBeNull();
  });
});

describe('DashboardPracticeCard', () => {
  it("shows the latest session's top six, closed", () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="bahrain-2026"
        initialResults={[session('fp1', 20), session('fp2', 20)]}
      />,
    );

    expect(view.textContent).toContain('FP2 · Driver 1 (fp2) fastest');
    expect(view.textContent).toContain('Driver 6 (fp2)');
    expect(view.textContent).not.toContain('Driver 1 (fp1)');
    expect(view.textContent).toContain('Show full results (P7–P20)');

    const button = expandButton(view);
    expect(button?.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the rest of the field mounted but inert while closed', () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="bahrain-2026"
        initialResults={[session('fp2', 20)]}
      />,
    );

    const region = remainingRegion(view);
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-hidden')).toBe('true');
    expect(region?.hasAttribute('inert')).toBe(true);
    expect(region?.textContent).toContain('Driver 7 (fp2)');
    expect(region?.textContent).toContain('Driver 20 (fp2)');
  });

  it('discloses the rest of the field in place and closes again', () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="bahrain-2026"
        initialResults={[session('fp1', 20)]}
      />,
    );

    const button = expandButton(view)!;
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(remainingRegion(view)?.getAttribute('aria-hidden')).toBe('false');
    expect(remainingRegion(view)?.hasAttribute('inert')).toBe(false);
    expect(view.textContent).toContain('Hide full results');

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(remainingRegion(view)?.getAttribute('aria-hidden')).toBe('true');
    expect(remainingRegion(view)?.hasAttribute('inert')).toBe(true);
  });

  it('offers no disclosure when the field fits in the closed card', () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="bahrain-2026"
        initialResults={[session('fp1', 6)]}
      />,
    );

    expect(view.textContent).toContain('Driver 6 (fp1)');
    expect(expandButton(view)).toBeNull();
    expect(remainingRegion(view)).toBeNull();
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
