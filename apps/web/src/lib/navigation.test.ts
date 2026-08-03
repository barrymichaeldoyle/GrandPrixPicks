import { describe, expect, it } from 'vitest';

import {
  footerF1Links,
  footerLegalLinks,
  footerPlayLinks,
  footerSupportLinks,
  primaryNavLinks,
  publicNavLinks,
} from './navigation';

describe('site navigation', () => {
  it('adds the game guide to public navigation without changing the authenticated app nav', () => {
    expect(primaryNavLinks).toEqual([
      { to: '/races', label: 'Races', exact: true },
      { to: '/leaderboard', label: 'Leaderboard' },
      { to: '/leagues', label: 'Leagues' },
    ]);
    expect(publicNavLinks).toEqual([
      { to: '/how-to-play', label: 'How to Play' },
      { to: '/races', label: 'Races', exact: true },
      { to: '/leaderboard', label: 'Leaderboard' },
      { to: '/leagues', label: 'Leagues' },
      { to: '/guides', label: 'Guides' },
    ]);
  });

  it('keeps useful public pages reachable without exposing personal app destinations', () => {
    expect(footerPlayLinks).toEqual([
      { to: '/how-to-play', label: 'How to Play' },
      { to: '/guides', label: 'F1 Guides' },
      { to: '/races', label: 'Race Calendar', exact: true },
      { to: '/leaderboard', label: 'Global Leaderboard' },
      { to: '/leagues', label: 'Prediction Leagues' },
    ]);
    expect(footerF1Links).toEqual([
      { to: '/f1-standings', label: 'F1 Standings' },
      { to: '/f1-team-mate-battles', label: 'Team-mate Battles' },
      { to: '/results-policy', label: 'Results & Penalties' },
    ]);
    expect(footerSupportLinks).toEqual([
      { to: '/about', label: 'About' },
      { to: '/support', label: 'Support' },
      { to: '/pricing', label: 'Season Pass' },
    ]);
    expect(footerLegalLinks).toEqual([
      { to: '/refund-policy', label: 'Refund Policy' },
      { to: '/terms', label: 'Terms of Service' },
      { to: '/privacy', label: 'Privacy Policy' },
    ]);

    const footerDestinations = [
      ...footerPlayLinks,
      ...footerF1Links,
      ...footerSupportLinks,
      ...footerLegalLinks,
    ].map((link) => link.to);

    expect(footerDestinations).not.toContain('/feed');
    expect(footerDestinations).not.toContain('/me');
    expect(footerDestinations).not.toContain('/settings');
  });
});
