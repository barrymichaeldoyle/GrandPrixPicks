import type { Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RaceRecap } from './RaceRecapCard';
import { RaceRecapCard } from './RaceRecapCard';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const RACE_ID = 'race_1' as Id<'races'>;

function recap(overrides: Partial<RaceRecap> = {}): RaceRecap {
  return {
    race: {
      id: RACE_ID,
      slug: 'bahrain-2026',
      name: 'Bahrain Grand Prix',
      round: 16,
      raceStartAt: 1_000,
    },
    windowEndsAt: 1_000 + 8 * 60 * 60 * 1000,
    serverNow: 2_000,
    status: 'scored',
    live: null,
    playerCount: 3,
    viewer: {
      points: 24,
      top5Points: 20,
      h2hPoints: 4,
      rank: 2,
      fieldSize: 3,
      seasonRank: 2,
      seasonRankDelta: 1,
    },
    friends: [],
    friendCount: 0,
    ...overrides,
  } as RaceRecap;
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

describe('RaceRecapCard', () => {
  it('leads with the race, the points and the position in the field', () => {
    const view = render(<RaceRecapCard recap={recap()} />);

    expect(view.textContent).toContain('Bahrain Grand Prix');
    expect(view.textContent).toContain('Round 16');
    expect(view.textContent).toContain('24');
    expect(view.textContent).toContain('P2');
    expect(view.textContent).toContain('of 3');
  });

  it('marks a running session as in progress and says the order can change', () => {
    const view = render(
      <RaceRecapCard
        recap={recap({
          status: 'live',
          live: { sessionType: 'race', updatedAt: 2_000 },
        })}
      />,
    );

    expect(view.textContent).toContain('Race in progress');
    expect(view.textContent).toContain(
      'The running order is live and can change',
    );
    // Still shows the provisional standing: that is the point of the state.
    expect(view.textContent).toContain('P2');
    // A live weekend has no settled leaderboard to send anyone to.
    expect(view.textContent).not.toContain('Weekend leaderboard');
    expect(view.textContent).toContain('Live scoring');
  });

  it('does not caveat a published result', () => {
    const view = render(<RaceRecapCard recap={recap()} />);

    expect(view.textContent).not.toContain('can change');
    expect(view.textContent).toContain('Full breakdown');
  });

  it('says results are pending rather than showing a score of nothing', () => {
    const view = render(
      <RaceRecapCard
        recap={recap({ status: 'pending', viewer: null, playerCount: 0 })}
      />,
    );

    expect(view.textContent).toContain('Results pending');
    expect(view.textContent).not.toContain('pts');
  });

  it('names a player who did not enter rather than printing a zero', () => {
    const view = render(<RaceRecapCard recap={recap({ viewer: null })} />);

    expect(view.textContent).toContain('You had no picks for this race');
  });

  it('holds the followed table back until there is someone to compare with', () => {
    const alone = render(
      <RaceRecapCard
        recap={recap({
          friends: [
            {
              userId: 'u1' as Id<'users'>,
              username: 'viewer',
              displayName: 'Viewer',
              avatarUrl: undefined,
              rank: 2,
              points: 24,
              isViewer: true,
            },
          ],
          friendCount: 0,
        })}
      />,
    );

    expect(alone.textContent).not.toContain('Players you follow');
  });

  it('lists followed players with their position and points', () => {
    const view = render(
      <RaceRecapCard
        recap={recap({
          friends: [
            {
              userId: 'u1' as Id<'users'>,
              username: 'viewer',
              displayName: 'Viewer',
              avatarUrl: undefined,
              rank: 2,
              points: 24,
              isViewer: true,
            },
            {
              userId: 'u2' as Id<'users'>,
              username: 'friend',
              displayName: 'Friend',
              avatarUrl: undefined,
              rank: 3,
              points: 5,
              isViewer: false,
            },
          ],
          friendCount: 1,
        })}
      />,
    );

    expect(view.textContent).toContain('Players you follow');
    expect(view.textContent).toContain('Viewer');
    expect(view.textContent).toContain('Friend');
    expect(view.textContent).toContain('P3');
  });
});
