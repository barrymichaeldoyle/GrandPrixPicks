import { createFileRoute, redirect } from '@tanstack/react-router';

import { circuitPageRedirectTarget } from '@/lib/raceWriteupSeo';

/**
 * Circuit pages are gone. See `circuits/index.tsx` for why.
 *
 * The target is the write-up when this venue has one, otherwise the calendar.
 * `/circuits/madring` landing on `/races` was handing Madrid queries to a
 * list of every round.
 */
export const Route = createFileRoute('/circuits/$circuitSlug')({
  beforeLoad: ({ params }) => {
    throw redirect({
      href: circuitPageRedirectTarget(params.circuitSlug),
      statusCode: 301,
    });
  },
});
