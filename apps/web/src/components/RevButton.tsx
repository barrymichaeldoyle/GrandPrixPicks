import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';

interface RevButtonProps {
  feedEventId: Id<'feedEvents'>;
  revCount: number;
  viewerHasReved: boolean;
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
      } else {
        await removeRev({ feedEventId });
      }
    } catch {
      setOptimisticReved(null);
      setOptimisticCount(null);
    }
  }

  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        onClick={handleRevClick}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          reved
            ? 'text-accent hover:bg-accent/10'
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
        <span>Rev</span>
      </button>
      <button
        type="button"
        onClick={onCountClick}
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-xs font-bold tabular-nums transition-colors hover:bg-accent/10 ${count > 0 ? 'text-accent' : 'text-text-muted/40'}`}
        title="See who Rev'd"
        disabled={count === 0}
      >
        {/* People icon */}
        <svg
          className="h-3 w-3"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="5" r="2" />
          <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
          <circle cx="12" cy="5" r="1.5" />
          <path d="M12 10c1.7 0 3 1.3 3 3" />
        </svg>
        {count}
      </button>
    </div>
  );
}
