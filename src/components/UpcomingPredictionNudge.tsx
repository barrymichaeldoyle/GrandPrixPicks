import { ArrowRight, Dices, Flag, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './Button';

interface UpcomingPredictionNudgeProps {
  raceName: string;
  isRandomizing?: boolean;
  error?: string | null;
  onRandomizeClick?: () => void;
  makePicksControl?: ReactNode;
}

export function UpcomingPredictionNudge({
  raceName,
  isRandomizing = false,
  error = null,
  onRandomizeClick,
  makePicksControl,
}: UpcomingPredictionNudgeProps) {
  return (
    <div className="border-b border-border bg-page px-4 py-3">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-xl border border-accent/20 bg-surface shadow-sm">
          <div className="bg-gradient-to-r from-accent-muted/70 via-surface to-surface p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-surface px-2.5 py-1 text-xs font-semibold text-accent">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Weekend picks are open
                </p>
                <p className="truncate text-sm font-semibold text-text sm:text-base">
                  {raceName}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  You haven&apos;t made any predictions yet.
                </p>
                {error && <p className="mt-1 text-xs text-error">{error}</p>}
              </div>
              <div className="flex items-center gap-2">
                {makePicksControl ?? (
                  <Button size="sm" rightIcon={ArrowRight}>
                    Make picks
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={Dices}
                  disabled={isRandomizing}
                  onClick={onRandomizeClick}
                >
                  {isRandomizing ? 'Randomizing...' : 'Quick randomize'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
