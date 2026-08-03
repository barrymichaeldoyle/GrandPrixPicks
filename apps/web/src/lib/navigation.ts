type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

/**
 * Core signed-in app navigation. The race calendar stays reachable from Home,
 * race detail back-links, empty states, and the footer — not as a top-level item.
 */
export const primaryNavLinks: SiteNavLink[] = [
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
  { to: '/guides', label: 'Guides' },
];

export const footerPlayLinks: SiteNavLink[] = [
  { to: '/how-to-play', label: 'How to Play' },
  { to: '/guides', label: 'F1 Guides' },
  { to: '/races', label: 'Race Calendar', exact: true },
  { to: '/leaderboard', label: 'Global Leaderboard' },
  { to: '/leagues', label: 'Prediction Leagues' },
];

export const footerF1Links: SiteNavLink[] = [
  { to: '/f1-standings', label: 'F1 Standings' },
  { to: '/f1-team-mate-battles', label: 'Team-mate Battles' },
  { to: '/results-policy', label: 'Results & Penalties' },
];

export const footerSupportLinks: SiteNavLink[] = [
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
  { to: '/pricing', label: 'Season Pass' },
];

export const footerLegalLinks: SiteNavLink[] = [
  { to: '/refund-policy', label: 'Refund Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
];
