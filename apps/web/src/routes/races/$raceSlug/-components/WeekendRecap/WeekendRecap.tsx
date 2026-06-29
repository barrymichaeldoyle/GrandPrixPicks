import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { DriverBadge } from '@/components/DriverBadge';

import type { RecapTier, WeekendRecapData } from './recap';

const TIER_CONFIG: Record<
  RecapTier,
  { emoji: string; headline: string; blurb: string }
> = {
  stellar: {
    emoji: '🏆',
    headline: 'Stellar weekend',
    blurb: 'You read the grid almost perfectly.',
  },
  strong: {
    emoji: '🔥',
    headline: 'Strong points',
    blurb: 'A solid haul to climb the table.',
  },
  onboard: {
    emoji: '✅',
    headline: 'On the board',
    blurb: 'Points banked. Onto the next one.',
  },
  tough: {
    emoji: '🏁',
    headline: 'Tough weekend',
    blurb: 'It happens. Reset for the next round.',
  },
};

function RecapStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/70 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-text">
        {value}
        {sub != null && (
          <span className="ml-1 text-xs font-medium text-text-muted">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}

type WeekendRecapProps = {
  recap: WeekendRecapData;
  raceName: string;
  /** Prominent share affordance (e.g. a ShareOnXButton). */
  shareSlot?: ReactNode;
};

/**
 * Post-race "moment": a celebratory weekend summary shown at the top of a
 * fully-scored race page. Surfaces the headline number, weekend rank, accuracy
 * stats, the viewer's best call, and a prominent share affordance.
 */
export function WeekendRecap({
  recap,
  raceName,
  shareSlot,
}: WeekendRecapProps) {
  const tier = TIER_CONFIG[recap.tier];

  return (
    <section
      data-testid="weekend-recap"
      className="mt-5 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-muted/40 via-surface to-surface"
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Weekend recap
            </p>
            <h2 className="mt-1 text-2xl font-bold text-text sm:text-3xl">
              {tier.emoji} {tier.headline}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Your {raceName} weekend is in the books. {tier.blurb}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-title text-4xl leading-none font-bold text-accent sm:text-5xl">
              {recap.totalPoints}
            </div>
            <div className="mt-1 text-xs font-medium text-text-muted">
              of {recap.maxPoints} pts
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {recap.rank && (
            <RecapStat
              label="Weekend rank"
              value={`P${recap.rank.position}`}
              sub={`of ${recap.rank.totalPlayers}`}
            />
          )}
          <RecapStat
            label="Bullseyes"
            value={recap.exactHits}
            sub={recap.exactHits === 1 ? 'exact call' : 'exact calls'}
          />
          <RecapStat
            label="In the top 5"
            value={`${recap.closeHits}/${recap.totalPicks}`}
          />
          {recap.h2hTotal > 0 && (
            <RecapStat
              label="Head-to-head"
              value={`${recap.h2hCorrect}/${recap.h2hTotal}`}
            />
          )}
        </div>

        {recap.bestCall && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/70 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase">
                Best call
              </span>
              <DriverBadge
                code={recap.bestCall.code}
                team={recap.bestCall.team}
                displayName={recap.bestCall.displayName}
                number={recap.bestCall.number}
                nationality={recap.bestCall.nationality}
              />
              <span className="min-w-0 truncate text-sm text-text-muted">
                called P{recap.bestCall.predictedPosition}
                {recap.bestCall.actualPosition != null &&
                  `, finished P${recap.bestCall.actualPosition}`}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold text-accent">
              +{recap.bestCall.points}
            </span>
          </div>
        )}

        {recap.perfectSessions.length > 0 && (
          <p className="mt-3 text-sm font-semibold text-accent">
            🎯 Perfect Top 5 in {recap.perfectSessions.join(' & ')}!
          </p>
        )}

        {shareSlot != null && <div className="mt-4">{shareSlot}</div>}
      </div>
    </section>
  );
}
