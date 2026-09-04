import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PracticeResults } from './PracticeClassification';
import {
  latestPracticeResult,
  PracticeClassification,
} from './PracticeClassification';
import { WeekendPracticeSection } from './WeekendPracticeSection';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

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

describe('WeekendPracticeSection', () => {
  it('uses the write-up heading and keeps the rest of the field in the document', () => {
    const view = render(
      <WeekendPracticeSection
        raceSlug="italy-2026"
        results={[session('fp2', 20)]}
      />,
    );

    expect(
      view.querySelector('[data-testid="weekend-practice"]'),
    ).not.toBeNull();
    expect(view.querySelector('h2')?.textContent).toBe('Free practice');
    expect(view.textContent).toContain('FP2 · Driver 1 (fp2) fastest');
    expect(view.textContent).toContain('Driver 6 (fp2)');

    const region = view.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-hidden')).toBe('true');
    expect(region?.hasAttribute('inert')).toBe(true);
    expect(region?.textContent).toContain('Driver 20 (fp2)');
  });

  it('renders nothing while no practice session is published', () => {
    const view = render(
      <WeekendPracticeSection raceSlug="italy-2026" results={[]} />,
    );
    expect(view.querySelector('[data-testid="weekend-practice"]')).toBeNull();
  });
});

describe('PracticeClassification card layout', () => {
  it('keeps the compact dashboard chrome', () => {
    const view = render(
      <PracticeClassification
        raceSlug="bahrain-2026"
        results={[session('fp1', 20)]}
        layout="card"
        analyticsSurface="dashboard"
      />,
    );

    expect(
      view.querySelector('[data-testid="dashboard-practice"]'),
    ).not.toBeNull();
    expect(view.textContent).toContain('Practice');
    expect(view.textContent).toContain('Show full results (P7–P20)');
  });
});
