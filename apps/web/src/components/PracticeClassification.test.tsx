import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PracticeResults } from '@/lib/practiceSessions';

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

  it('opens on the newest session and tabs the earlier ones', () => {
    const view = render(
      <WeekendPracticeSection
        raceSlug="italy-2026"
        results={[session('fp2', 20), session('fp1', 20)]}
      />,
    );

    const tabs = [...view.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual(['FP1', 'FP2']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
    ]);
    expect(view.textContent).toContain('FP2 · Driver 1 (fp2) fastest');

    act(() => {
      (tabs[0] as HTMLButtonElement).click();
    });

    expect(view.textContent).toContain('FP1 · Driver 1 (fp1) fastest');
    expect(view.textContent).toContain('Driver 6 (fp1)');
    expect(view.textContent).not.toContain('Driver 6 (fp2)');
  });

  it('leaves a single published session untabbed', () => {
    const view = render(
      <WeekendPracticeSection
        raceSlug="italy-2026"
        results={[session('fp1', 20)]}
      />,
    );

    expect(view.querySelectorAll('[role="tab"]').length).toBe(0);
  });

  it('follows the newest session until a reader picks a tab', () => {
    const view = render(
      <WeekendPracticeSection
        raceSlug="italy-2026"
        results={[session('fp1', 20)]}
      />,
    );
    act(() => {
      root?.render(
        <WeekendPracticeSection
          raceSlug="italy-2026"
          results={[session('fp1', 20), session('fp2', 20)]}
        />,
      );
    });

    expect(view.textContent).toContain('FP2 · Driver 1 (fp2) fastest');
  });

  it('renders nothing while no practice session is published', () => {
    const view = render(
      <WeekendPracticeSection raceSlug="italy-2026" results={[]} />,
    );
    expect(view.querySelector('[data-testid="weekend-practice"]')).toBeNull();
  });
});
