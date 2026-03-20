import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';

interface RevButtonProps {
  feedEventId: Id<'feedEvents'>;
  revCount: number;
  viewerHasReved: boolean;
}

export function RevButton({
  feedEventId,
  revCount,
  viewerHasReved,
}: RevButtonProps) {
  const giveRev = useMutation(api.feed.giveRev);
  const removeRev = useMutation(api.feed.removeRev);
  const [optimisticReved, setOptimisticReved] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const reved = optimisticReved ?? viewerHasReved;
  const count = optimisticCount ?? revCount;

  async function handleClick() {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
        reved
          ? 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400'
          : 'text-text-muted hover:bg-surface-muted hover:text-text'
      }`}
      title={reved ? 'Remove Rev' : 'Give a Rev'}
    >
      {/* Tachometer / rev counter icon */}
      <svg
        className="h-3.5 w-3.5"
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
      <span>{reved ? "Rev'd" : 'Rev'}</span>
      {count > 0 && <span className="tabular-nums opacity-70">{count}</span>}
    </button>
  );
}
