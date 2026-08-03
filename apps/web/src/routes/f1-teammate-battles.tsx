import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * The page moved to `/f1-team-mate-battles` when the copy switched to the
 * British spelling F1's own press uses. This path stays as a permanent redirect
 * rather than a deletion: it is a public, indexable URL, and the closed-form
 * spelling is the one most people type.
 */
export const Route = createFileRoute('/f1-teammate-battles')({
  beforeLoad: () => {
    throw redirect({ to: '/f1-team-mate-battles', statusCode: 301 });
  },
});
