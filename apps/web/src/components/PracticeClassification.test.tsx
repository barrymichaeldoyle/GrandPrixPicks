import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PracticeResults } from '@/lib/practiceSessions';

import { useQuery } from '@/integrations/convex/query';

import { resetSessionTimeView } from '@/lib/sessionTimeView';

import { WeekendPracticeSection } from './WeekendPracticeSection';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/integrations/convex/query', () => ({ useQuery: vi.fn() }));
beforeEach(() => vi.mocked(useQuery).mockReturnValue(undefined));

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
  resetSessionTimeView();
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
    expect(view.textContent).toContain('D06');

    const region = view.querySelector('table[hidden]');
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

  it('counts down to the next session', () => {
    const hour = 60 * 60 * 1000;
    const now = Date.now();
    const view = render(
      <WeekendPracticeSection
        raceSlug="madrid-2026"
        results={[session('fp1', 20)]}
        schedule={{
          raceStartAt: now + 48 * hour,
          fp1StartAt: now - 4 * hour,
          fp2StartAt: now + 2 * hour,
          qualiStartAt: now + 24 * hour,
        }}
      />,
    );
    expect(view.textContent).toContain('FP2');
    const body = view.textContent ?? '';
    expect(body.indexOf('View full results')).toBeGreaterThan(-1);
    expect(body.indexOf('View full results')).toBeLessThan(body.indexOf('FP2'));
    expect(body).toMatch(/FP2[\s\S]*\d{2}h \d{2}m/);
    expect(body).toMatch(/\d{2}:\d{2}/);
    expect(body).not.toMatch(/\d{2}h \d{2}m \d{2}s/);
  });

  it('says the next session is underway once it has started', () => {
    const hour = 60 * 60 * 1000;
    const now = Date.now();
    const view = render(
      <WeekendPracticeSection
        raceSlug="madrid-2026"
        results={[session('fp1', 20)]}
        schedule={{
          raceStartAt: now + 48 * hour,
          fp1StartAt: now - 4 * hour,
          fp2StartAt: now - 10 * 60 * 1000,
          qualiStartAt: now + 24 * hour,
        }}
      />,
    );
    expect(view.textContent).toContain('Underway');
    const body = view.textContent ?? '';
    expect(body.indexOf('View full results')).toBeLessThan(
      body.indexOf('Underway'),
    );
    expect(body).toMatch(/\d{2}:\d{2}/);
  });
  it('receives a newly published session without reloading the route', () => {
    const view = render(
      <WeekendPracticeSection raceSlug="madrid-2026" results={[]} />,
    );
    expect(view.textContent).toBe('');
    vi.mocked(useQuery).mockReturnValue([session('fp1', 22)]);
    act(() =>
      root?.render(
        <WeekendPracticeSection raceSlug="madrid-2026" results={[]} />,
      ),
    );
    expect(view.textContent).toContain('FP1 · Driver 1 (fp1) fastest');
  });

  it('opens the full timing sheet and closes it with Escape', () => {
    const view = render(
      <WeekendPracticeSection
        raceSlug="madrid-2026"
        results={[session('fp1', 22)]}
        schedule={{ name: 'Spanish Grand Prix', raceStartAt: 1 }}
      />,
    );
    const trigger = view.querySelector<HTMLButtonElement>(
      '[aria-haspopup="dialog"]',
    )!;
    trigger.focus();
    act(() => trigger.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Spanish Grand Prix');
    expect(dialog?.textContent).toContain('Free Practice 1 results');
    expect(dialog?.querySelector('img.gpp-flag')?.getAttribute('src')).toBe(
      '/flags/es.svg',
    );
    expect(dialog?.textContent).toContain('P22');
    expect(dialog?.textContent).toContain('D22');
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
