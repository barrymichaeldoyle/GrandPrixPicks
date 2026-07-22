import { Check, Target } from 'lucide-react';
import type { ReactNode } from 'react';

import { DriverBadge } from '@/components/DriverBadge';

import type { RecapTier, WeekendRecapData } from './recap';

const TIER_LABELS: Record<RecapTier, string> = {
  stellar: 'Front-running weekend',
  strong: 'Strong weekend',
  onboard: 'Points scored',
  tough: 'Weekend complete',
};

function RecapStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="min-w-0 py-2 sm:py-0">
      <dt className="text-[10px] font-semibold tracking-[0.16em] text-text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-lg font-bold text-text">
        {value}
        {detail != null && (
          <span className="text-xs font-medium text-text-muted">{detail}</span>
        )}
      </dd>
    </div>
  );
}

type WeekendRecapProps = {
  recap: WeekendRecapData;
  raceName: string;
  shareSlot?: ReactNode;
};

/** A factual post-race classification summary for the signed-in viewer. */
export function WeekendRecap({
  recap,
  raceName,
  shareSlot,
}: WeekendRecapProps) {
  const hitRate =
    recap.totalPicks > 0
      ? Math.round((recap.closeHits / recap.totalPicks) * 100)
      : 0;

  return (
    <section
      data-testid="weekend-recap"
      className="mt-5 rounded-sm border border-border bg-surface-elevated"
    >
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            {raceName} · Weekend result
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
            {recap.rank ? (
              <div className="flex items-end gap-2">
                <span className="font-title text-5xl leading-[0.85] font-bold text-text sm:text-6xl">
                  P{recap.rank.position}
                </span>
                <span className="pb-0.5 text-sm text-text-muted">
                  of {recap.rank.totalPlayers}
                </span>
              </div>
            ) : (
              <h2 className="font-title text-3xl leading-none font-bold text-text">
                Result recorded
              </h2>
            )}

            <div className="pb-0.5">
              <p className="font-title text-2xl leading-none font-bold text-accent">
                +{recap.totalPoints} pts
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {recap.maxPoints} available
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm text-text-muted">
            <span className="font-semibold text-text">
              {TIER_LABELS[recap.tier]}.
            </span>{' '}
            Your qualifying and race predictions are now reflected in the
            standings.
          </p>
        </div>

        {shareSlot != null && <div className="shrink-0">{shareSlot}</div>}
      </div>

      <div className="border-t border-border px-4 py-3 sm:px-6">
        <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">
          <RecapStat
            label="Exact calls"
            value={recap.exactHits}
            detail={recap.exactHits === 1 ? 'bullseye' : 'bullseyes'}
          />
          <RecapStat
            label="Top 5 accuracy"
            value={`${hitRate}%`}
            detail={`${recap.closeHits}/${recap.totalPicks}`}
          />
          {recap.h2hTotal > 0 && (
            <RecapStat
              label="Head-to-head"
              value={`${recap.h2hCorrect}/${recap.h2hTotal}`}
              detail="correct"
            />
          )}
          {recap.bestCall && (
            <div className="col-span-2 min-w-0 py-2 sm:col-span-1 sm:py-0">
              <dt className="text-[10px] font-semibold tracking-[0.16em] text-text-muted uppercase">
                Best call
              </dt>
              <dd className="mt-1 flex min-w-0 items-center gap-2">
                <DriverBadge
                  code={recap.bestCall.code}
                  team={recap.bestCall.team}
                  displayName={recap.bestCall.displayName}
                  number={recap.bestCall.number}
                  nationality={recap.bestCall.nationality}
                  size="sm"
                />
                <span className="truncate text-xs text-text-muted">
                  P{recap.bestCall.predictedPosition} · +{recap.bestCall.points}{' '}
                  pts
                </span>
              </dd>
            </div>
          )}
        </dl>

        {recap.perfectSessions.length > 0 && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-accent">
            <Target className="h-3.5 w-3.5" />
            Perfect Top 5 · {recap.perfectSessions.join(' & ')}
            <Check className="h-3.5 w-3.5" />
          </p>
        )}
      </div>
    </section>
  );
}
