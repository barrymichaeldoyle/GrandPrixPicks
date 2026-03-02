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

const routeTree = rootRoute.addChildren([
  racesRoute.addChildren([raceSlugRoute]),
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
