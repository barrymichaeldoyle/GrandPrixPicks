import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, Gauge } from 'lucide-react';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import {
  FeedItem,
  FeedItemSkeleton,
  SessionSeparator,
} from '../components/FeedItem';
import { FollowButton } from '../components/FollowButton';
import { canonicalMeta } from '../lib/site';

export const Route = createFileRoute('/feed/$feedEventId')({
  component: FeedEventPage,
  head: ({ params }) => {
    const canonical = canonicalMeta(`/feed/${params.feedEventId}`);
    return {
      meta: [
        { title: 'Prediction | Grand Prix Picks' },
        {
          name: 'description',
          content: 'View a single prediction and the revs it received.',
        },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function RevsSection({ feedEventId }: { feedEventId: Id<'feedEvents'> }) {
  const revUsers = useQuery(api.feed.getRevUsers, { feedEventId });
  const me = useQuery(api.users.me, {});

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-text">Revs</h2>
      </div>

      {revUsers === undefined ? (
        <div className="space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
              <div className="ml-auto h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />
            </div>
          ))}
        </div>
      ) : revUsers.length === 0 ? (
        <div className="py-6 text-center text-sm text-text-muted">
          No revs yet.
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {revUsers.map((user) =>
            user ? (
              <div key={user.userId} className="flex items-center gap-3 py-3">
                <Link
                  to="/p/$username"
                  params={{ username: user.username ?? '' }}
                  search={{ from: '/feed', fromLabel: 'feed' }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                  tabIndex={user.username ? 0 : -1}
                >
                  <Avatar
                    avatarUrl={user.avatarUrl}
                    username={user.username}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {user.displayName ?? user.username ?? 'Unknown'}
                    </p>
                    {user.username && (
                      <p className="truncate text-xs text-text-muted">
                        @{user.username}
                      </p>
                    )}
                  </div>
                </Link>
                {me && user.userId !== me._id && (
                  <FollowButton followeeId={user.userId} />
                )}
              </div>
            ) : null,
          )}
        </div>
      )}
    </section>
  );
}

function FeedEventSkeleton() {
  return (
    <div className="space-y-3">
      <FeedItemSkeleton />
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="h-3 w-12 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="space-y-1 px-4 py-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
              <div className="ml-auto h-9 w-24 animate-pulse rounded-lg bg-surface-muted" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeedEventPage() {
  const { feedEventId } = Route.useParams();
  const { isLoaded, isSignedIn } = useAuth();

  const feedEvent = useQuery(
    api.feed.getFeedEvent,
    isLoaded && isSignedIn
      ? { feedEventId: feedEventId as Id<'feedEvents'> }
      : 'skip',
  );

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
        ) : !isSignedIn ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
            <Gauge className="mx-auto mb-3 h-8 w-8 text-accent" />
            <p className="mb-4 text-sm text-text-muted">
              Sign in to view this prediction and its revs.
            </p>
            <Button asChild variant="primary" size="md">
              <Link to="/feed">Go to feed</Link>
            </Button>
          </div>
        ) : feedEvent === undefined ? (
          <FeedEventSkeleton />
        ) : !feedEvent ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
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
            {feedEvent.session && (
              <SessionSeparator session={feedEvent.session} />
            )}
            <FeedItem
              event={feedEvent.event}
              attachedContent={
                <RevsSection feedEventId={feedEventId as Id<'feedEvents'>} />
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
