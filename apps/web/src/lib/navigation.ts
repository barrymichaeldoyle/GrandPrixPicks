type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

/** Nav links for signed-out users. The logo handles the home link. */
export const primaryNavLinks: SiteNavLink[] = [
  { to: '/races', label: 'Races', exact: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
];

/** Nav links for signed-in users. */
export const signedInNavLinks: SiteNavLink[] = [
  { to: '/feed', label: 'Feed' },
  { to: '/races', label: 'Races', exact: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
];

export const footerExploreLinks: SiteNavLink[] = [
  { to: '/', label: 'Home', exact: true },
  { to: '/feed', label: 'Feed' },
  { to: '/races', label: 'Races', exact: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
  { to: '/me', label: 'My Picks' },
];
