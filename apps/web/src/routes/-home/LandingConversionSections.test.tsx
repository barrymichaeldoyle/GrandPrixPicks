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
          season={2026}
          players={[
            {
              rank: 1,
              userId: 'user-1',
              username: 'overcut-king',
              displayName: 'Overcut King',
              points: 317,
              rankDelta: 0,
            },
            {
              rank: 2,
              userId: 'user-2',
              username: 'apex-predator',
              displayName: 'Apex Predator',
              points: 282,
              rankDelta: 2,
            },
          ]}
        />,
      ),
    );

    expect(container.textContent).toContain(
      'Your picks count on every leaderboard.',
    );
    expect(container.textContent).toContain('Overcut King');
    expect(container.textContent).toContain('Sunday Strategists');
    expect(container.querySelector('a[href="/leaderboard"]')).not.toBeNull();

    const leagueButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Start a league'),
    );
    act(() => leagueButton?.click());
    expect(requestSignIn).toHaveBeenCalledWith('/leagues/create');
  });
});
