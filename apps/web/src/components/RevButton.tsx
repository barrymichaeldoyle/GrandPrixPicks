import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';

interface RevButtonProps {
  feedEventId: Id<'feedEvents'>;
  revCount: number;
  viewerHasReved: boolean;
  recentRevUsers?: {
    userId: Id<'users'>;
    username?: string;
    avatarUrl?: string;
  }[];
  onCountClick?: () => void;
}

export function RevButton({
  feedEventId,
  revCount,
  viewerHasReved,
  onCountClick,
}: RevButtonProps) {
  const giveRev = useMutation(api.feed.giveRev);
  const removeRev = useMutation(api.feed.removeRev);
  const [optimisticReved, setOptimisticReved] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const reved = optimisticReved ?? viewerHasReved;
  const count = optimisticCount ?? revCount;
  async function handleRevClick() {
    const willRev = !reved;
    setOptimisticReved(willRev);
    setOptimisticCount(count + (willRev ? 1 : -1));
    try {
      if (willRev) {
        await giveRev({ feedEventId });
        captureAnalyticsEvent('feed_event_reved', {
          feed_event_id: feedEventId,
        });
      } else {
        await removeRev({ feedEventId });
        captureAnalyticsEvent('feed_event_unreved', {
          feed_event_id: feedEventId,
        });
      }
    } catch {
      setOptimisticReved(null);
      setOptimisticCount(null);
    }
  }

  const revIcon = (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 11.5 A6 6 0 1 1 13.5 11.5" />
      <path d="M8 8 L5.5 5.5" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );

  return (
    <div
      className={`inline-flex h-8 w-[5.25rem] items-center rounded-sm border transition-colors ${
        reved
          ? 'border-accent/40 bg-accent/10'
          : 'border-border/70 bg-surface-muted/30 hover:border-border'
      }`}
    >
      <button
        type="button"
        onClick={handleRevClick}
        title={reved ? 'Remove Rev' : 'Give a Rev'}
        className={`inline-flex h-full flex-1 items-center justify-center gap-1 rounded-l-sm pl-2.5 text-xs font-semibold transition-colors ${
          reved
            ? 'text-accent hover:bg-accent/10'
            : 'text-text-muted hover:bg-surface-muted hover:text-text'
        }`}
      >
        {revIcon}
        <span>Rev</span>
      </button>

      <div
        className={`h-4 w-px shrink-0 ${reved ? 'bg-accent/30' : 'bg-border/70'}`}
      />

      <button
        type="button"
        onClick={onCountClick}
        title={count > 0 ? "See who Rev'd" : 'No revs yet'}
        disabled={count === 0}
        className={`inline-flex h-full w-7 shrink-0 items-center justify-center rounded-r-sm text-xs font-bold tabular-nums transition-colors ${
          reved
            ? 'text-accent hover:bg-accent/10'
            : count > 0
              ? 'text-text-muted hover:bg-surface-muted hover:text-text'
              : 'cursor-default text-text-muted/35'
        }`}
      >
        {count}
      </button>
    </div>
  );
}
