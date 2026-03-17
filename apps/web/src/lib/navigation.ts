type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

export const primaryNavLinks: SiteNavLink[] = [
  { to: '/', label: 'Home', exact: true },
  { to: '/races', label: 'Races', exact: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
];

export const footerExploreLinks: SiteNavLink[] = [
  ...primaryNavLinks,
  { to: '/me', label: 'My Picks' },
];
