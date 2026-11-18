import { act } from 'react';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { nextOpener, OffSeasonHero } from './OffSeasonHero';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children?: ReactNode;
    to: string;
    params?: { username?: string };
    className?: string;
  }) => (
    <a
      href={params?.username ? to.replace('$username', params.username) : to}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

const now = Date.UTC(2026, 11, 14, 12);

describe('nextOpener', () => {
  it('counts whole days to the first 2027 race day', () => {
    const opener = nextOpener(now);
    expect(opener?.round.round).toBe(1);
    expect(opener?.round.slug).toBe('bahrain');
    // 14 Mar 2027 00:00 UTC is 89.5 days after 14 Dec 12:00: rounded up.
    expect(opener?.days).toBe(90);
  });
});

describe('OffSeasonHero', () => {
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

  it('reads as one sentence about next season, and shows how the last ended', () => {
    act(() =>
      root.render(
        <OffSeasonHero
          now={now}
          podium={{
            season: 2026,
            players: [
              { rank: 1, userId: 'a', username: 'OvercutKing', points: 612 },
              { rank: 2, userId: 'b', username: 'ApexPredator', points: 579 },
              { rank: 3, userId: 'c', username: 'UndercutAce', points: 566 },
            ],
          }}
        />,
      ),
    );
    expect(container.querySelector('h1')?.textContent).toBe(
      'Predict the F1 Top 5 in 2027',
    );
    expect(container.textContent).toContain('Bahrain Grand Prix in');
    expect(container.textContent).toContain('Race day Sun 14 Mar');
    expect(container.textContent).toContain('2026 final standings');
    const winner = container.querySelector('a[href="/p/OvercutKing"]');
    expect(winner?.textContent).toContain('Rank 1');
    expect(winner?.className).toContain('bg-podium-gold');
    expect(
      container.querySelector('a[href="/f1-2027-calendar"]'),
    ).not.toBeNull();
  });

  it('leaves the standings out when there are none', () => {
    act(() => root.render(<OffSeasonHero now={now} podium={null} />));
    expect(container.textContent).not.toContain('final standings');
  });
});
