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
        initialResults={[session('fp2', 20), session('fp1', 20)]}
      />,
    );

    expect(view.querySelector('h2')?.textContent).toBe('Practice');
    expect(view.textContent).not.toContain('fastest');
    const columns = [
      ...view.querySelectorAll('[data-testid="dashboard-practice"] p'),
    ];
    expect(columns.map((column) => column.textContent)).toEqual([
      'Free Practice 1',
      'Free Practice 2',
    ]);
    expect(view.querySelector('.gpp-column-split')).not.toBeNull();
  });

  it("shows each session's weather beside the label", () => {
    const fp1StartAt = Date.UTC(2026, 8, 11, 11, 30);
    const fp2StartAt = Date.UTC(2026, 8, 11, 15);
    const hour = (at: number, temperatureC: number) => ({
      at,
      localDate: '2026-09-11',
      localHour: new Date(at).getUTCHours(),
      forecastPeriodHours: 1,
      temperatureC,
      conditionCode: 'clearsky_day',
      precipitationAmountMm: 0,
      precipitationProbability: 5,
      thunderProbability: 0,
      windSpeedMps: 3,
      windGustMps: 6,
    });
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceSlug="madrid-2026"
        race={{
          raceStartAt: Date.UTC(2026, 8, 13, 13),
          fp1StartAt,
          fp2StartAt,
        }}
        weather={{
          isStale: false,
          attribution: {
            name: 'MET Norway',
            url: 'https://www.met.no/en',
            licenseName: 'CC BY 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
          },
          forecast: {
            raceSlug: 'madrid-2026',
            timeZone: 'Europe/Madrid',
            provider: 'met_no',
            providerUpdatedAt: fp1StartAt,
            fetchedAt: fp1StartAt,
            checkedAt: fp1StartAt,
            expiresAt: fp2StartAt,
            eventDates: ['2026-09-11'],
            hours: [hour(fp1StartAt, 28), hour(fp2StartAt, 31)],
            days: [],
          },
        }}
        initialResults={[session('fp2', 20), session('fp1', 20)]}
      />,
    );

    expect(view.textContent).toContain('Clear · 28°C');
    expect(view.textContent).toContain('Clear · 31°C');
    expect(view.textContent).not.toContain('Forecast');
  });

  it('stops at the top six, so the card never carries the whole field', () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        initialResults={[session('fp1', 20)]}
      />,
    );

    expect(view.textContent).toContain('D06');
    expect(view.textContent).not.toContain('D07');
    // The card header already says FP1; a second labelled column is a nested
    // table around a list that is the whole card.
    expect(
      [...view.querySelectorAll('[data-testid="dashboard-practice"] p')].map(
        (column) => column.textContent,
      ),
    ).toEqual([]);
    expect(view.textContent).toContain('Full results');
  });

  it('renders nothing while no practice session is published', () => {
    const view = render(
      <DashboardPracticeCard raceId={RACE_ID} initialResults={[]} />,
    );

    expect(view.querySelector('[data-testid="dashboard-practice"]')).toBeNull();
  });

  it('opens the full classification from one control on the card', () => {
    const view = render(
      <DashboardPracticeCard
        raceId={RACE_ID}
        raceName="Spanish Grand Prix"
        raceSlug="madrid-2026"
        initialResults={[session('fp2', 20), session('fp1', 20)]}
      />,
    );

    const openers = [
      ...view.querySelectorAll<HTMLButtonElement>(
        '[data-testid="dashboard-practice"] button',
      ),
    ];
    expect(openers.map((button) => button.textContent)).toEqual([
      'Full results',
    ]);

    act(() => openers[0]!.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Spanish Grand Prix');
    expect(dialog?.textContent).toContain('Free Practice 2 results');
    expect(dialog?.textContent).toContain('P20');
    expect(dialog?.textContent).toContain('D20');
  });
});
