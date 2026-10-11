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
      { to: '/how-to-play', label: 'How to play' },
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
    // The weekend write-up is the footer's featured link when one exists;
    // this hub is only the fallback, but it still has to stay reachable.
    expect(footerPlayLinks).toEqual([
      { to: '/how-to-play', label: 'How to play' },
      { to: '/races', label: 'Race calendar', exact: true },
      { to: '/leaderboard', label: 'Global leaderboard' },
      { to: '/leagues', label: 'Prediction leagues' },
    ]);
    expect(footerF1Links).toEqual([
      { to: '/f1-standings', label: 'F1 standings' },
      { to: '/f1-qualifying-standings', label: 'Qualifying championship' },
      { to: '/f1-team-mate-battles', label: 'Team-mate battles' },
      { to: '/f1-2027-driver-line-up', label: '2027 driver line-up' },
      { to: '/f1-2027-calendar', label: '2027 calendar' },
      { to: '/trmnl', label: 'F1 on TRMNL' },
    ]);
    expect(footerSupportLinks).toEqual([
      { to: '/about', label: 'About' },
      { to: '/support', label: 'Support' },
      { to: '/pricing', label: 'Season Pass' },
      { to: '/results-policy', label: 'Results and penalties' },
    ]);
    expect(footerLegalLinks).toEqual([
      { to: '/refund-policy', label: 'Refund policy' },
      { to: '/terms', label: 'Terms of service' },
      { to: '/privacy', label: 'Privacy policy' },
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
      { to: '/how-to-play', label: 'How to play' },
      { to: '/guides', label: 'F1 guides' },
      { to: '/about', label: 'About' },
      { to: '/support', label: 'Support' },
      { to: '/pricing', label: 'Season Pass' },
      { to: '/results-policy', label: 'Results and penalties' },
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
