export type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

export const primaryNavLinks: Array<SiteNavLink> = [
  { to: '/', label: 'Home', exact: true },
  { to: '/races', label: 'Races', exact: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
];

export const footerExploreLinks: Array<SiteNavLink> = [
  ...primaryNavLinks,
  { to: '/me', label: 'My Picks' },
];
