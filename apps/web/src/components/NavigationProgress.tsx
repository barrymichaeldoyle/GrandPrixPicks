import { useRouterState } from '@tanstack/react-router';
/**
 * A thin chartreuse bar along the top edge while a navigation waits on its
 * loaders or a route chunk.
 *
 * Without it, a tap on a slow phone connection changed nothing on screen until
 * the next page was ready: the menu closed, the old page stayed, and the tap
 * read as broken. Leaderboard and profile each load in two waves, so this was
 * routine rather than rare.
 *
 * It mounts as soon as the router is loading but stays transparent for 150ms
 * (`.gpp-nav-progress` in styles.css), so a quick navigation never flashes it.
 */
export function NavigationProgress() {
  const loading = useRouterState({ select: (state) => state.isLoading });
  if (!loading) {
    return null;
  }
  return (
    <div
      className="gpp-nav-progress pointer-events-none fixed inset-x-0 top-0 z-[130] h-0.5 overflow-hidden"
      data-testid="navigation-progress"
      aria-hidden="true"
    >
      <div className="gpp-nav-progress-bar h-full w-full bg-accent" />
    </div>
  );
}
