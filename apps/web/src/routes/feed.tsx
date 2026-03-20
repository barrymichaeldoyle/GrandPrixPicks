import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Gauge } from 'lucide-react';

import { Button } from '../components/Button';
import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
  SessionSeparator,
} from '../components/FeedItem';
import { canonicalMeta } from '../lib/site';

export const Route = createFileRoute('/feed')({
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

  // Insert session separators before the first event of each race+session group
  const seenSessions = new Set<string>();
  const items: React.ReactNode[] = [];

  for (const event of feed.events) {
    if (event.type === 'score_published' && event.raceId && event.sessionType) {
      const key = `${event.raceId}_${event.sessionType}`;
      if (!seenSessions.has(key)) {
        seenSessions.add(key);
        items.push(
          <SessionSeparator key={`sep_${key}`} session={feed.sessions[key]} />,
        );
      }
    }
    items.push(<FeedItem key={event._id} event={event} />);
  }

  return <div className="space-y-3">{items}</div>;
}

function FeedPage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="space-y-3">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Gauge className="mx-auto mb-4 h-12 w-12 text-text-muted/50" />
          <h1 className="mb-2 text-2xl font-bold text-text">Your Feed</h1>
          <p className="mb-6 text-text-muted">
            Sign in to see scores from your friends and leagues.
          </p>
          <Button asChild variant="primary" size="md">
            <Link to="/">Go to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold text-text">Your Feed</h1>
          </div>
          <p className="text-xs text-text-muted">
            People you follow + your leagues
          </p>
        </div>
        <FeedContent />
      </div>
    </div>
  );
}
