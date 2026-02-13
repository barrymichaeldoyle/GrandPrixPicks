/** Skeleton that mirrors RaceCard layout for loading states. */
interface RaceCardSkeletonProps {
  /** When true, shows a placeholder for the "NEXT UP" badge to match the next-race card. */
  isNext?: boolean;
}

const FLAG_WIDTH = 24;
const FLAG_HEIGHT = 18;

export function RaceCardSkeleton({ isNext }: RaceCardSkeletonProps) {
  return (
    <div
      className={`block animate-pulse rounded-xl border bg-surface p-2.5 sm:p-3 ${
        isNext ? 'border-accent/50' : 'border-border'
      }`}
      aria-hidden
    >
      <div className="flex min-h-full flex-col gap-1">
        <div className="min-w-0 flex-1">
          {/* Top row: flag, round, optional badge */}
          <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span
              className="shrink-0 rounded bg-surface-muted"
              style={{ width: FLAG_WIDTH, height: FLAG_HEIGHT }}
            />
            <span className="h-3 w-10 shrink-0 rounded bg-surface-muted" />
            {isNext && (
              <span className="h-5 w-16 shrink-0 rounded bg-accent/20" />
            )}
            <span className="h-6.5 w-28 shrink-0 rounded-full bg-surface-muted" />
          </div>

          {/* Title: one line so skeleton isn’t taller than typical content */}
          <div className="mb-1 flex h-5 items-center">
            <span className="block h-4 w-full max-w-[200px] rounded bg-surface-muted" />
          </div>

          {/* Schedule */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="h-3.5 w-4 shrink-0 rounded bg-surface-muted" />
            <span className="h-3.5 w-20 shrink-0 rounded bg-surface-muted" />
            <span className="h-3.5 w-16 shrink-0 rounded bg-surface-muted" />
          </div>
        </div>
        <span
          className="mt-auto h-3.5 w-3.5 shrink-0 rounded bg-surface-muted"
          aria-hidden
        />
      </div>
    </div>
  );
}
