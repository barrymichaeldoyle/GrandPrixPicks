import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { createContext, useContext } from 'react';

const StoryContext = createContext<ReactNode>(null);

function StoryOutlet() {
  const story = useContext(StoryContext);
  return story ?? <Outlet />;
}

const rootRoute = createRootRoute({
  component: StoryOutlet,
});

const racesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'races',
  component: StoryOutlet,
});

const raceSlugRoute = createRoute({
  getParentRoute: () => racesRoute,
  path: '$raceSlug',
  component: StoryOutlet,
});

const profilesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'p',
  component: StoryOutlet,
});

const profileUsernameRoute = createRoute({
  getParentRoute: () => profilesRoute,
  path: '$username',
  component: StoryOutlet,
});

const leaguesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'leagues',
  component: StoryOutlet,
});

const leagueSlugRoute = createRoute({
  getParentRoute: () => leaguesRoute,
  path: '$slug',
  component: StoryOutlet,
});

/**
 * Flat destinations the rail cards link to. They render nothing themselves —
 * the router only has to be able to build an href, and a `<Link to>` whose
 * path is absent from the tree throws instead of rendering the card.
 */
const FLAT_PATHS = [
  'leaderboard',
  'f1-standings',
  'f1-team-mate-battles',
  'how-to-play',
  'guides',
  'about',
  'support',
  'pricing',
  'results-policy',
  'terms',
  'privacy',
  'refund-policy',
] as const;

const flatRoutes = FLAT_PATHS.map((path) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: StoryOutlet,
  }),
);

const routeTree = rootRoute.addChildren([
  racesRoute.addChildren([raceSlugRoute]),
  profilesRoute.addChildren([profileUsernameRoute]),
  leaguesRoute.addChildren([leagueSlugRoute]),
  ...flatRoutes,
]);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Storybook serves stories from `/iframe.html`, so without this the router
  // reports that as the current location. Components that branch on the route
  // then take their "not on this page" path and render nothing, which reads as
  // a broken story rather than a deliberate one (see `RailFooterLinks`).
  history: createMemoryHistory({ initialEntries: ['/'] }),
});

export function StorybookRouter({ children }: PropsWithChildren) {
  return (
    <StoryContext.Provider value={children}>
      <RouterProvider router={router} />
    </StoryContext.Provider>
  );
}
