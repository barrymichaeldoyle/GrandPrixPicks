import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { DriverBadge } from '../DriverBadge';

export function H2HPicksDialog({
  userId,
  raceId,
  sessionType,
  displayName,
  onClose,
}: {
  userId: Id<'users'>;
  raceId: Id<'races'>;
  sessionType: 'quali' | 'sprint_quali' | 'sprint' | 'race';
  displayName: string;
  onClose: () => void;
}) {
  const picks = useQuery(api.h2h.getH2HPicksForFeedItem, {
    userId,
    raceId,
    sessionType,
  });
  const ROW_COUNT = 11;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-4 w-full max-w-xs rounded-sm border border-border bg-surface">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className="font-semibold text-text">Head to Head</h3>
            <p className="text-xs text-text-muted">
              {displayName}&apos;s picks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-border" />

        {/* Rows */}
        <div className="py-1">
          {picks === undefined ? (
            [...Array(ROW_COUNT)].map((_, i) => (
              <div key={i} className="flex h-9 items-center gap-2 px-4">
                <div className="h-2 w-20 shrink-0 animate-pulse rounded bg-surface-muted" />
                <div className="ml-auto h-6 w-10 shrink-0 animate-pulse rounded-md bg-surface-muted" />
                <div className="h-2 w-2.5 shrink-0 animate-pulse rounded bg-surface-muted" />
                <div className="h-6 w-10 shrink-0 animate-pulse rounded-md bg-surface-muted" />
                <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-surface-muted" />
              </div>
            ))
          ) : !picks || picks.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">
              No H2H picks for this session.
            </p>
          ) : (
            picks.map((pick) => {
              const d1Picked = pick.predictedWinnerId === pick.driver1._id;

              return (
                <div
                  key={pick.matchupId}
                  className="flex h-9 items-center gap-2 px-4"
                >
                  <span className="w-20 shrink-0 truncate text-xs leading-none text-text-muted">
                    {pick.team}
                  </span>

                  <span
                    className={`ml-auto inline-flex shrink-0 ${d1Picked ? '' : 'opacity-30'}`}
                  >
                    <DriverBadge
                      code={pick.driver1.code}
                      team={pick.driver1.team}
                      displayName={pick.driver1.displayName}
                      nationality={pick.driver1.nationality}
                      size="sm"
                    />
                  </span>

                  <span className="shrink-0 text-xs leading-none text-text-muted/40">
                    vs
                  </span>

                  <span
                    className={`inline-flex shrink-0 ${!d1Picked ? '' : 'opacity-30'}`}
                  >
                    <DriverBadge
                      code={pick.driver2.code}
                      team={pick.driver2.team}
                      displayName={pick.driver2.displayName}
                      nationality={pick.driver2.nationality}
                      size="sm"
                    />
                  </span>

                  <span className="flex w-4 shrink-0 items-center">
                    {pick.hasResult ? (
                      pick.correct ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-error" />
                      )
                    ) : null}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
