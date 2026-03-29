import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { Avatar } from './Avatar';

const RECENT_REV_PREVIEW_LIMIT = 5;

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
  recentRevUsers,
  onCountClick,
}: RevButtonProps) {
  const giveRev = useMutation(api.feed.giveRev);
  const removeRev = useMutation(api.feed.removeRev);
  const me = useQuery(api.users.me);
  const [optimisticReved, setOptimisticReved] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const reved = optimisticReved ?? viewerHasReved;
  const count = optimisticCount ?? revCount;
  const displayedRecentRevUsers = (() => {
    const baseUsers = recentRevUsers ?? [];

    if (!me) {
      return baseUsers;
    }

    if (optimisticReved === true) {
      return [
        {
          userId: me._id,
          username: me.username,
          avatarUrl: me.avatarUrl ?? undefined,
        },
        ...baseUsers.filter((user) => user.userId !== me._id),
      ].slice(0, RECENT_REV_PREVIEW_LIMIT);
    }

    if (optimisticReved === false) {
      return baseUsers.filter((user) => user.userId !== me._id);
    }

    return baseUsers;
  })();

  async function handleRevClick() {
    const willRev = !reved;
    setOptimisticReved(willRev);
    setOptimisticCount(count + (willRev ? 1 : -1));
    try {
      if (willRev) {
        await giveRev({ feedEventId });
      } else {
        await removeRev({ feedEventId });
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
      className={`inline-flex min-h-8 items-center rounded-full border transition-colors ${
        reved
          ? 'border-accent/40 bg-accent/10'
          : 'border-border/70 bg-surface-muted/30 hover:border-border'
      }`}
    >
      <button
        type="button"
        onClick={handleRevClick}
        title={reved ? 'Remove Rev' : 'Give a Rev'}
        className={`inline-flex items-center gap-1.5 rounded-l-full px-3 py-1.5 text-xs font-semibold transition-colors ${
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
        title="See who Rev'd"
        disabled={count === 0}
        className={`inline-flex min-h-8 items-center justify-center gap-1 rounded-r-full px-2.5 py-1.5 text-xs font-bold tabular-nums transition-colors ${
          reved
            ? 'text-accent hover:bg-accent/10'
            : count > 0
              ? 'text-text-muted hover:bg-surface-muted hover:text-text'
              : 'text-text-muted/30'
        }`}
      >
        {displayedRecentRevUsers.length > 0 ? (
          <>
            <span className="flex items-center">
              {displayedRecentRevUsers.map((u, i) => (
                <span
                  key={u.userId}
                  className="rounded-full ring-1 ring-surface"
                  style={{ marginLeft: i > 0 ? '-5px' : undefined }}
                >
                  <Avatar
                    avatarUrl={u.avatarUrl}
                    username={u.username}
                    size="xs"
                  />
                </span>
              ))}
            </span>
            {count > displayedRecentRevUsers.length && (
              <span>+{count - displayedRecentRevUsers.length}</span>
            )}
          </>
        ) : (
          <span className="min-w-5 text-center">{count}</span>
        )}
      </button>
    </div>
  );
}
