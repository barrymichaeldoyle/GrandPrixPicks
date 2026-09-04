import { describe, expect, it } from 'vitest';

import {
  footerF1Links,
  footerLegalLinks,
  footerPlayLinks,
  footerPrimaryLink,
  footerSupportLinks,
  primaryNavLinks,
  publicNavLinks,
  railFooterLinks,
} from './navigation';

describe('site navigation', () => {
  it('keeps authenticated app nav focused on play destinations, with guides for public nav', () => {
    expect(primaryNavLinks).toEqual([
      { to: '/leaderboard', label: 'Leaderboard' },
      { to: '/leagues', label: 'Leagues' },
    ]);
    expect(publicNavLinks).toEqual([
      { to: '/how-to-play', label: 'How to Play' },
      { to: '/leaderboard', label: 'Leaderboard' },
      { to: '/leagues', label: 'Leagues' },
      { to: '/guides', label: 'Guides' },
    ]);
  });

  it('keeps useful public pages reachable without exposing personal app destinations', () => {
    expect(footerPrimaryLink).toEqual({
      to: '/f1-predictions-this-weekend',
      label: 'Predictions this weekend',
      exact: true,
    });
    expect(footerPlayLinks).toEqual([
      { to: '/how-to-play', label: 'How to Play' },
      { to: '/races', label: 'Race Calendar', exact: true },
      { to: '/leaderboard', label: 'Global Leaderboard' },
      { to: '/leagues', label: 'Prediction Leagues' },
    ]);
    expect(footerF1Links).toEqual([
      { to: '/f1-standings', label: 'F1 Standings' },
      { to: '/f1-qualifying-standings', label: 'Qualifying Championship' },
      { to: '/f1-team-mate-battles', label: 'Team-mate Battles' },
      { to: '/f1-2027-driver-line-up', label: '2027 Driver Line-Up' },
      { to: '/f1-2027-calendar', label: '2027 Calendar' },
      { to: '/circuits', label: 'F1 Circuits' },
    ]);
    expect(footerSupportLinks).toEqual([
      { to: '/about', label: 'About' },
      { to: '/support', label: 'Support' },
      { to: '/pricing', label: 'Season Pass' },
      { to: '/results-policy', label: 'Results & Penalties' },
    ]);
    expect(footerLegalLinks).toEqual([
      { to: '/refund-policy', label: 'Refund Policy' },
      { to: '/terms', label: 'Terms of Service' },
      { to: '/privacy', label: 'Privacy Policy' },
    ]);

    const footerDestinations = [
      footerPrimaryLink,
      ...footerPlayLinks,
      ...footerF1Links,
      ...footerSupportLinks,
      ...footerLegalLinks,
    ].map((link) => link.to);

    expect(footerDestinations).not.toContain('/feed');
    expect(footerDestinations).not.toContain('/me');
    expect(footerDestinations).not.toContain('/settings');
  });

  it('keeps the dashboard rail footer to small print the Quick Links card does not already carry', () => {
    expect(railFooterLinks).toEqual([
      { to: '/how-to-play', label: 'How to Play' },
      { to: '/guides', label: 'F1 Guides' },
      { to: '/about', label: 'About' },
      { to: '/support', label: 'Support' },
      { to: '/pricing', label: 'Season Pass' },
      { to: '/results-policy', label: 'Results & Penalties' },
      { to: '/terms', label: 'Terms' },
      { to: '/privacy', label: 'Privacy' },
      { to: '/refund-policy', label: 'Refunds' },
    ]);

    // Quick Links owns these on the same screen, so repeating them in the rail
    // footer is the bloat this list exists to avoid.
    const quickLinkDestinations = [
      '/races',
      '/leaderboard',
      '/leagues',
      '/me',
      '/f1-standings',
      '/f1-team-mate-battles',
    ];
    for (const destination of quickLinkDestinations) {
      expect(railFooterLinks.map((link) => link.to)).not.toContain(destination);
    }
  });
});
