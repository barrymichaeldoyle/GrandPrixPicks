import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { ArrowLeft, ArrowRight, Gauge } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { FeedItem } from '@/components/FeedItem/FeedItem';
import { SessionGroup } from '@/components/FeedItem/SessionGroup';
import { FeedItemSkeleton } from '@/components/FeedItem/states';
import { SignInPrompt } from '@/components/SignInPrompt';
import { getRaceWriteup } from '@/lib/raceWriteups';
import { canonicalMeta, noIndexMeta } from '@/lib/site';

export const Route = createFileRoute('/feed/$feedEventId')({
  component: FeedEventPage,
  head: ({ params }) => {
    const canonical = canonicalMeta(`/feed/${params.feedEventId}`);
    return {
      meta: [
        { title: 'Prediction | Grand Prix Picks' },
        {
          name: 'description',
          content: 'View a single prediction.',
        },
        // A single activity item is a couple of lines of user-generated text.
        // The feed index is already excluded; keep its detail pages out too.
        ...noIndexMeta(),
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function FeedEventSkeleton() {
  return (
    <div className="space-y-3">
      <FeedItemSkeleton />
    </div>
  );
}

function FeedEventPage() {
  const { feedEventId } = Route.useParams();
  const { isLoaded, isSignedIn } = useViewerSession();
  const me = useQuery(api.users.me, {});

  // Asked signed out too: the query answers for news, which the Discord #news
  // posts link here, and returns null for a player's activity.
  const feedEvent = useQuery(
    api.feed.getFeedEventByRef,
    isLoaded ? { ref: feedEventId } : 'skip',
  );

  // There is deliberately no public preview of a player's activity: another
  // player's picks are not ours to show, and the old card's "Go to feed"
  // button pointed at /feed, which redirects to /.
  if (isLoaded && !isSignedIn && feedEvent === null) {
    return (
      <SignInPrompt
        eyebrow="Activity"
        title="This one is someone's actual pick"
        description="Predictions are only visible to signed-in players."
        actionLabel="Sign in to view it"
        behind={[
          'The prediction this link points at',
          'Activity from the players you follow',
          'Your own feed activity',
        ]}
      />
    );
  }

  const isNews = feedEvent?.event.type === 'race_news';

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {isSignedIn && !isNews ? (
          <div className="mb-5">
            <Button asChild variant="text" size="sm" leftIcon={ArrowLeft}>
              <Link to="/feed">Back to feed</Link>
            </Button>
          </div>
        ) : null}

        {!isLoaded ? (
          <FeedEventSkeleton />
        ) : feedEvent === undefined ? (
          <FeedEventSkeleton />
        ) : !feedEvent ? (
          <div className="rounded-sm border border-border bg-surface px-6 py-10 text-center">
            <Gauge className="mx-auto mb-3 h-8 w-8 text-accent" />
            <h1 className="mb-2 text-xl font-semibold text-text">
              Prediction not found
            </h1>
            <p className="text-sm text-text-muted">
              This feed item doesn&apos;t exist or is no longer available.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedEvent.session ? (
              <SessionGroup
                session={feedEvent.session}
                events={[feedEvent.event]}
                viewerId={me?._id}
              />
            ) : (
              <FeedItem event={feedEvent.event} />
            )}
            {isNews ? (
              <WeekendLink
                raceSlug={feedEvent.event.raceSlug}
                raceName={feedEvent.event.raceName}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Where a news item hands the reader on: the weekend's write-up, which carries
 * every story for that race, or the race page when the weekend has none.
 * Season-wide news belongs to no race, so it gets the feed for a signed-in
 * reader and nothing otherwise.
 */
function WeekendLink({
  raceSlug,
  raceName,
}: {
  raceSlug?: string;
  raceName?: string;
}) {
  const { isSignedIn } = useViewerSession();
  const writeup = getRaceWriteup(raceSlug);

  if (writeup) {
    return (
      <Button asChild size="sm" rightIcon={ArrowRight}>
        <Link to={writeup.to}>{writeup.cta}</Link>
      </Button>
    );
  }
  if (raceSlug && raceName) {
    return (
      <Button asChild size="sm" rightIcon={ArrowRight}>
        <Link to="/races/$raceSlug" params={{ raceSlug }}>
          See the {raceName} race page
        </Link>
      </Button>
    );
  }
  if (isSignedIn) {
    return (
      <Button asChild variant="text" size="sm" leftIcon={ArrowLeft}>
        <Link to="/feed">Back to feed</Link>
      </Button>
    );
  }
  return null;
}

import { useViewerSession } from '@/integrations/clerk/useViewerSession';
