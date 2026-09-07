import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Every circuit page redirects to the calendar. See `circuits/index.tsx` for
 * why they were removed and why the target is `/races`.
 */
export const Route = createFileRoute('/circuits/$circuitSlug')({
  beforeLoad: () => {
    throw redirect({ to: '/races', statusCode: 301 });
  },
});
