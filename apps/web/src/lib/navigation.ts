type SiteNavLink = {
  to: string;
  label: string;
  exact?: boolean;
};

/**
 * Public nav links: auth-independent, so the header renders them immediately
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
  { to: '/how-to-play', label: 'How to Play' },
  { to: '/results-policy', label: 'Results Policy' },
  { to: '/races', label: 'Races', exact: true },
  { to: '/f1-standings', label: 'F1 Standings' },
  { to: '/f1-teammate-battles', label: 'Teammate H2H' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
  { to: '/feed', label: 'Feed' },
  { to: '/me', label: 'My Results' },
];
