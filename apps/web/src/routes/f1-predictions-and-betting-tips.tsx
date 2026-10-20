import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * This URL was removed, but Google still served it at position 1 in October
 * 2026. The predictions hub is the page that answers the same searches, so
 * the old address sends people there instead of to a 404.
 */
export const Route = createFileRoute('/f1-predictions-and-betting-tips')({
  beforeLoad: () => {
    throw redirect({ to: '/f1-predictions-this-weekend', statusCode: 301 });
  },
});
