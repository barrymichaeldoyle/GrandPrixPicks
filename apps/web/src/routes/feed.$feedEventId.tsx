import {
  REACTION_BY_TYPE,
  REACTION_OPTIONS,
} from '@grandprixpicks/shared/reactions';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, Gauge } from 'lucide-react';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button/Button';
import { FeedItem } from '@/components/FeedItem/FeedItem';
import { SessionGroup } from '@/components/FeedItem/SessionGroup';
import { FeedItemSkeleton } from '@/components/FeedItem/states';
import { FollowButton } from '@/components/FollowButton';
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
          content: 'View a single prediction and the reactions it received.',
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

function ReactionsSection({ feedEventId }: { feedEventId: Id<'feedEvents'> }) {
  const reactionUsers = useQuery(api.feed.getReactionUsers, { feedEventId });
  const me = useQuery(api.users.me, {});
  const groups =
    reactionUsers === undefined
      ? []
      : REACTION_OPTIONS.map((reaction) => ({
          reaction,
          users: reactionUsers.filter(
            (user) => user?.reactionType === reaction.type,
          ),
        })).filter((group) => group.users.length > 0);

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-text">
          Reactions
          {reactionUsers?.length ? ` · ${reactionUsers.length}` : ''}
        </h2>
      </div>

      {reactionUsers === undefined ? (
        <div className="space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
              <div className="ml-auto h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />
            </div>
          ))}
        </div>
      ) : reactionUsers.length === 0 ? (
        <div className="py-6 text-center text-sm text-text-muted">
          No reactions yet.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ reaction, users }) => (
            <section
              key={reaction.type}
              className="overflow-hidden rounded-sm border border-border/70"
            >
              <div className="flex items-center gap-2 bg-surface-elevated px-3 py-2">
                <span aria-hidden="true">{reaction.emoji}</span>
                <h3 className="flex-1 text-xs font-semibold text-text">
                  {reaction.label}
                </h3>
                <span className="gpp-mono text-xs text-text-muted">
                  {users.length}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {users.map((user) =>
                  user ? (
                    <div
                      key={user.userId}
                      className="flex items-center gap-3 px-3 py-3"
                    >
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
                            {resolveDisplayName(user)}
                          </p>
                          {user.username && (
                            <p className="truncate text-xs text-text-muted">
                              @{user.username}
                            </p>
                          )}
                        </div>
                      </Link>
                      <span
                        aria-label={REACTION_BY_TYPE[user.reactionType].label}
                      >
                        {REACTION_BY_TYPE[user.reactionType].emoji}
                      </span>
                      {me && user.userId !== me._id && (
                        <FollowButton followeeId={user.userId} />
                      )}
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function FeedEventSkeleton() {
  return (
    <div className="space-y-3">
      <FeedItemSkeleton />
      <section className="rounded-sm border border-border bg-surface">
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
  const { isLoaded, isSignedIn } = useViewerSession();
  const me = useQuery(api.users.me, {});

  const feedEvent = useQuery(
    api.feed.getFeedEvent,
    isLoaded && isSignedIn
      ? { feedEventId: feedEventId as Id<'feedEvents'> }
      : 'skip',
  );

  // Reached from a reaction push, so the reader is almost always the signed-in
  // owner of the pick. There is deliberately no public preview: another
  // player's picks are not ours to show, and the old card's "Go to feed"
  // button pointed at /feed, which redirects to /.
  if (!isSignedIn) {
    return (
      <SignInPrompt
        eyebrow="Activity"
        title="This one is someone's actual pick"
        description="Predictions and the reactions they collect are only visible to signed-in players."
        actionLabel="Sign in to view it"
        behind={[
          'The prediction this link points at',
          'Every reaction it collected',
          'Activity from the players you follow',
          'Reactions on your own picks',
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
            <section className="rounded-sm border border-border bg-surface p-4">
              <ReactionsSection feedEventId={feedEventId as Id<'feedEvents'>} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';
