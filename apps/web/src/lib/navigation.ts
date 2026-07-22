type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

/**
 * Public nav links — auth-independent, so the header renders them immediately
 * (SSR + first paint). The signed-in extras (Feed, My Results) are rendered
 * directly in the header once Clerk resolves.
 */
export const primaryNavLinks: SiteNavLink[] = [
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
  { to: '/me', label: 'My Results' },
];
