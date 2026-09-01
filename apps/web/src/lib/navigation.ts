type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

/**
 * Core play destinations shared by the public nav and footer. Signed-in chrome
 * carries the same two as header tabs (and, below 844px, as mobile tab bar
 * items) — see `APP_NAV_TABS`, which is the authority for that surface; this
 * list is the public/footer one. The race calendar stays reachable from Home,
 * race detail back-links, empty states, the Quick Links card and the footer,
 * but not as a top-level item.
 */
export const primaryNavLinks: SiteNavLink[] = [
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
];

/**
 * Public pages also expose the game guide. Keep it out of the authenticated
 * header, which is just brand + notifications + account.
 */
export const publicNavLinks: SiteNavLink[] = [
  { to: '/how-to-play', label: 'How to Play' },
  ...primaryNavLinks,
  { to: '/guides', label: 'Guides' },
];

export const footerPlayLinks: SiteNavLink[] = [
  { to: '/f1-predictions-this-weekend', label: 'Predictions This Weekend' },
  { to: '/how-to-play', label: 'How to Play' },
  { to: '/guides', label: 'F1 Guides' },
  { to: '/races', label: 'Race Calendar', exact: true },
  { to: '/leaderboard', label: 'Global Leaderboard' },
  { to: '/leagues', label: 'Prediction Leagues' },
];

export const footerF1Links: SiteNavLink[] = [
  { to: '/f1-standings', label: 'F1 Standings' },
  { to: '/f1-team-mate-battles', label: 'Team-mate Battles' },
  { to: '/f1-2027-calendar', label: '2027 Calendar' },
  { to: '/circuits', label: 'F1 Circuits' },
  { to: '/results-policy', label: 'Results & Penalties' },
];

export const footerSupportLinks: SiteNavLink[] = [
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
  { to: '/pricing', label: 'Season Pass' },
];

/**
 * Condensed set for the signed-in dashboard rail. The full four-group footer is
 * a public-page / SEO surface; in the rail it only has to be the "everything
 * else" run of small print, so game navigation lives in Quick Links instead and
 * anything duplicated there is dropped.
 */
export const railFooterLinks: SiteNavLink[] = [
  { to: '/how-to-play', label: 'How to Play' },
  { to: '/guides', label: 'F1 Guides' },
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
  { to: '/pricing', label: 'Season Pass' },
  { to: '/results-policy', label: 'Results Policy' },
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/refund-policy', label: 'Refunds' },
];

export const footerLegalLinks: SiteNavLink[] = [
  { to: '/refund-policy', label: 'Refund Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
];
