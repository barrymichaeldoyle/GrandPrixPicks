type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

/** Core app navigation shared by signed-in and signed-out product pages. */
export const primaryNavLinks: SiteNavLink[] = [
  { to: '/races', label: 'Races', exact: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
];

/**
 * Public pages also expose the game guide. Keep it out of the authenticated
 * app header, where making picks and checking results are the primary jobs.
 */
export const publicNavLinks: SiteNavLink[] = [
  { to: '/how-to-play', label: 'How to Play' },
  ...primaryNavLinks,
];

export const footerPlayLinks: SiteNavLink[] = [
  { to: '/how-to-play', label: 'How to Play' },
  { to: '/races', label: 'Race Calendar', exact: true },
  { to: '/leaderboard', label: 'Global Leaderboard' },
  { to: '/leagues', label: 'Prediction Leagues' },
];

export const footerF1Links: SiteNavLink[] = [
  { to: '/f1-standings', label: 'F1 Standings' },
  { to: '/f1-teammate-battles', label: 'Teammate Battles' },
  { to: '/results-policy', label: 'Results & Penalties' },
];

export const footerSupportLinks: SiteNavLink[] = [
  { to: '/support', label: 'Support' },
  { to: '/pricing', label: 'Season Pass' },
];

export const footerLegalLinks: SiteNavLink[] = [
  { to: '/refund-policy', label: 'Refund Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
];
