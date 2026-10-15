import type { RosterDriver } from '@/lib/roster';

/** Stays with the driver pool; the full list below owns editing and saving. */
export function MobilePickSummary({
  drivers,
  reviewId,
  onReview,
}: {
  drivers: RosterDriver[];
  reviewId: string;
  onReview: () => void;
}) {
  return (
    <div
      className="sticky top-(--nav-height) z-30 border-y border-border bg-page py-2 @min-[875px]:hidden"
      data-testid="mobile-pick-summary"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text" aria-live="polite">
          Your Top 5{' '}
          <span className="gpp-mono text-text-muted">{drivers.length}/5</span>
        </p>
        <button
          type="button"
          className="min-h-11 px-2 text-sm font-medium text-text underline underline-offset-4 hover:text-accent disabled:text-text-disabled disabled:no-underline"
          disabled={drivers.length === 0}
          aria-controls={reviewId}
          onClick={onReview}
        >
          Review picks
        </button>
      </div>
      <ol
        aria-label="Current pick order"
        className="grid grid-cols-5 gap-1.5 pb-1"
      >
        {Array.from({ length: 5 }, (_, index) => {
          const driver = drivers[index];
          return (
            <li
              key={index}
              className={`min-w-0 rounded-sm border px-2 py-1.5 ${driver ? 'border-border bg-surface' : 'border-dashed border-border'}`}
            >
              <span className="gpp-mono block text-xs text-text-muted">
                P{index + 1}
              </span>
              <span
                className={`gpp-mono mt-1 block text-sm ${driver ? 'text-text' : 'text-text-disabled'}`}
              >
                <span className="sr-only">
                  {driver ? `${driver.displayName}, ` : 'Empty'}
                </span>
                <span aria-hidden="true">{driver?.code ?? '—'}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
