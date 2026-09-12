import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { ArrowLeft, Gauge } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { FeedItem } from '@/components/FeedItem/FeedItem';
import { SessionGroup } from '@/components/FeedItem/SessionGroup';
import { FeedItemSkeleton } from '@/components/FeedItem/states';
import { SignInPrompt } from '@/components/SignInPrompt';
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

  const feedEvent = useQuery(
    api.feed.getFeedEvent,
    isLoaded && isSignedIn
      ? { feedEventId: feedEventId as Id<'feedEvents'> }
      : 'skip',
  );

  // There is deliberately no public preview: another
  // player's picks are not ours to show, and the old card's "Go to feed"
  // button pointed at /feed, which redirects to /.
  if (!isSignedIn) {
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

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-5">
          <Button asChild variant="text" size="sm" leftIcon={ArrowLeft}>
            <Link to="/feed">Back to feed</Link>
          </Button>
        </div>

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
          </div>
        )}
      </div>
    </div>
  );
}
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
