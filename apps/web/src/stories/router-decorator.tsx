import {
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

const routeTree = rootRoute.addChildren([
  racesRoute.addChildren([raceSlugRoute]),
  profilesRoute.addChildren([profileUsernameRoute]),
  leaguesRoute.addChildren([leagueSlugRoute]),
]);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

export function StorybookRouter({ children }: PropsWithChildren) {
  return (
    <StoryContext.Provider value={children}>
      <RouterProvider router={router} />
    </StoryContext.Provider>
  );
}
