import { act } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompetitionSection } from './CompetitionSection';
import { ScoringSection } from './ScoringSection';

const requestSignIn = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
    onClick,
  }: {
    children?: ReactNode;
    to: string;
    className?: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock('@/integrations/clerk/runtime-control', () => ({
  useClerkRuntimeControl: () => ({
    requestSignIn,
    signInPending: false,
  }),
  useClerkWarmHandlers: () => ({}),
}));

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

describe('landing conversion sections', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    requestSignIn.mockReset();
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

    expect(container.textContent).toContain('Close still counts.');
    expect(container.textContent).toContain(
      'A perfect five earns 25 points, but you do not need the exact order',
    );
    expect(container.textContent).not.toContain('points,but');
    expect(container.textContent).toContain('5pointsExact position');
    expect(container.textContent).toContain('3pointsOne position away');
    expect(container.textContent).toContain('1pointIn the actual Top 5');
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      '/how-to-play',
    );
    expect(container.textContent).toContain('Form and scoring guides');
    expect(container.querySelector('a[href="/f1-standings"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/guides/$guideSlug"]'),
    ).not.toBeNull();
  });

  it('connects live global proof with a private-league action', () => {
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
    expect(container.textContent).toContain('Sunday Strategists');
    // The invented league has to say so on screen, not only to a screen reader.
    expect(container.textContent).toContain('Example');
    expect(container.querySelector('a[href="/leaderboard"]')).not.toBeNull();
    // The section's own call to action, back to the picker it argues for.
    expect(container.querySelector('a[href="#landing-picks"]')).not.toBeNull();

    const leagueButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Start a league'),
    );
    act(() => leagueButton?.click());
    expect(requestSignIn).toHaveBeenCalledWith('/leagues/create');
  });
});
