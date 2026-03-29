import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Gauge } from 'lucide-react';

import { Button } from '../../components/Button';
import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
  SessionSeparator,
} from '../../components/FeedItem';
import { canonicalMeta } from '../../lib/site';

export const Route = createFileRoute('/feed/')({
  component: FeedPage,
  head: () => {
    const canonical = canonicalMeta('/feed');
    return {
      meta: [
        { title: 'Feed | Grand Prix Picks' },
        {
          name: 'description',
          content: "See what's happening with your friends and leagues.",
        },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function FeedContent() {
  const feed = useQuery(api.feed.getPersonalizedFeed, {});

  if (feed === undefined) {
    return (
      <div className="space-y-3">
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </div>
    );
  }

  if (!feed || feed.events.length === 0) {
    return (
      <FeedEmptyState
        icon={Gauge}
        message="Follow other players or join leagues to see their scores here."
      />
    );
  }

  type Group =
    | { kind: 'session'; key: string; events: (typeof feed.events)[number][] }
    | { kind: 'standalone'; event: (typeof feed.events)[number] };

  const groups: Group[] = [];
  const sessionGroupMap = new Map<string, Group & { kind: 'session' }>();

  for (const event of feed.events) {
    if (
      (event.type === 'score_published' || event.type === 'session_locked') &&
      event.raceId &&
      event.sessionType
    ) {
      const key = `${event.raceId}_${event.sessionType}`;
      let group = sessionGroupMap.get(key);
      if (!group) {
        group = { kind: 'session', key, events: [] };
        sessionGroupMap.set(key, group);
        groups.push(group);
      }
      group.events.push(event);
    } else {
      groups.push({ kind: 'standalone', event });
    }
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        if (group.kind === 'standalone') {
          return <FeedItem key={group.event._id} event={group.event} />;
        }
        const session = feed.sessions[group.key];
        const isMulti = group.events.length > 1;
        const sessionWithTime = {
          ...session,
          createdAt: group.events[group.events.length - 1]?.createdAt,
        };
        return (
          <div key={group.key}>
            <SessionSeparator session={sessionWithTime} grouped={isMulti} />
            {group.events.map((event, i) => {
              const position = !isMulti
                ? undefined
                : i === 0
                  ? 'first'
                  : i === group.events.length - 1
                    ? 'last'
                    : 'middle';
              return (
                <FeedItem
                  key={event._id}
                  event={event}
                  grouped={isMulti}
                  position={position}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FeedPage() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold text-text">Your Feed</h1>
          </div>
        </div>

        {!isLoaded ? (
          <div className="space-y-3">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        ) : !isSignedIn ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
            <Gauge className="mx-auto mb-3 h-8 w-8 text-accent" />
            <p className="mb-4 text-sm text-text-muted">
              Sign in to see scores from your friends and leagues.
            </p>
            <Button asChild variant="primary" size="md">
              <Link to="/">Go to home</Link>
            </Button>
          </div>
        ) : (
          <FeedContent />
        )}
      </div>
    </div>
  );
}
