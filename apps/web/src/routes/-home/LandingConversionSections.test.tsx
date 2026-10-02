import { act } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompetitionSection } from './CompetitionSection';
import { LandingWeekendNews } from './LandingWeekendNews';
import { ScoringSection } from './ScoringSection';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    hash,
    className,
    onClick,
  }: {
    children?: ReactNode;
    to: string;
    hash?: string;
    className?: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a
      href={hash ? `${to}#${hash}` : to}
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  ),
}));

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

describe('landing conversion sections', () => {
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

  it('explains every scoring band without relying on colour alone', () => {
    act(() => root.render(<ScoringSection />));

    expect(container.textContent).toContain('How scoring works');
    expect(container.textContent).toContain(
      'Each of your five picks is scored against where that driver actually finished.',
    );
    expect(container.textContent).toContain('5 pointsExact position');
    expect(container.textContent).toContain('3 pointsOne position away');
    expect(container.textContent).toContain('1 pointIn the actual Top 5');
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      '/how-to-play',
    );
    expect(container.textContent).toContain('Form and scoring guides');
    expect(container.querySelector('a[href="/f1-standings"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/guides/$guideSlug"]'),
    ).not.toBeNull();
  });

  it('shows the real weekend board and nothing invented', () => {
    act(() =>
      root.render(
        <CompetitionSection
          picksAnchorId="landing-picks"
          board={{
            raceName: 'Dutch Grand Prix',
            raceSlug: 'dutch-grand-prix',
            round: 12,
            playerCount: 14,
            players: [
              {
                rank: 1,
                userId: 'user-1',
                username: 'overcut-king',
                points: 93,
              },
              {
                rank: 2,
                userId: 'user-2',
                username: 'apex-predator',
                points: 81,
              },
            ],
          }}
        />,
      ),
    );

    expect(container.textContent).toContain(
      'Every weekend is scored from zero.',
    );
    // The board is one race weekend, named and sized, not the season table.
    expect(container.textContent).toContain('Dutch Grand Prix');
    expect(container.textContent).toContain('14 players');
    // The handle, never a display name: public boards are named by username.
    expect(container.textContent).toContain('overcut-king');
    expect(container.textContent).not.toContain('Example');
    expect(container.querySelector('a[href="/leaderboard"]')).not.toBeNull();
    // The section's own call to action, back to the picker it argues for.
    expect(container.querySelector('a[href="#landing-picks"]')).not.toBeNull();
  });

  it('links each weekend headline to its card on the write-up', () => {
    act(() =>
      root.render(
        <LandingWeekendNews
          raceName="Bahrain Grand Prix"
          raceSlug="bahrain-2026"
          news={{
            total: 18,
            items: [
              {
                key: 'colapinto-sepang-grid-penalty',
                headline: 'Colapinto drops 15 places on the Sepang grid',
                sourceName: 'Formula 1',
                team: null,
              },
            ],
          }}
        />,
      ),
    );

    expect(container.textContent).toContain('Bahrain Grand Prix news');
    expect(
      container.querySelector(
        'a[href="/f1-2026-bahrain-grand-prix-predictions#news-colapinto-sepang-grid-penalty"]',
      )?.textContent,
    ).toContain('Colapinto drops 15 places');
    expect(
      container.querySelector(
        'a[href="/f1-2026-bahrain-grand-prix-predictions"]',
      ),
    ).not.toBeNull();
  });

  it('renders nothing for a race without a write-up', () => {
    act(() =>
      root.render(
        <LandingWeekendNews
          raceName="Test Grand Prix"
          raceSlug="no-such-race"
          news={null}
        />,
      ),
    );
    expect(container.innerHTML).toBe('');
  });
});
