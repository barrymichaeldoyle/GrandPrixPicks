import { describe, expect, it } from 'vitest';

import { footerExploreLinks } from './navigation';

describe('footerExploreLinks', () => {
  it('includes the public championship standings alongside game navigation', () => {
    expect(footerExploreLinks).toEqual([
      { to: '/', label: 'Home', exact: true },
      { to: '/how-to-play', label: 'How to Play' },
      // The footer is the results policy's only site-wide inbound link, so
      // crawlers can reach it from every page rather than one FAQ answer.
      { to: '/results-policy', label: 'Results Policy' },
      { to: '/races', label: 'Races', exact: true },
      { to: '/f1-standings', label: 'F1 Standings' },
      { to: '/f1-teammate-battles', label: 'Teammate H2H' },
      { to: '/leaderboard', label: 'Leaderboard' },
      { to: '/leagues', label: 'Leagues' },
      { to: '/feed', label: 'Feed' },
      { to: '/me', label: 'My Results' },
    ]);
  });
});
