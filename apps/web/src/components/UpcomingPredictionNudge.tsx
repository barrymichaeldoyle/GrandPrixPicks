import { ArrowRight, Dices, Flag, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './Button';
import { Flag as CountryFlag } from './Flag';
import { getCountryCodeForRace } from './RaceCard';

interface UpcomingPredictionNudgeProps {
  raceName: string;
  raceSlug: string;
  message?: string;
  randomizeLabel?: string;
  isRandomizing?: boolean;
  error?: string | null;
  onRandomizeClick?: () => void;
  onDismiss?: () => void;
  makePicksControl?: ReactNode;
}

export function UpcomingPredictionNudge({
  raceName,
  raceSlug,
  message = 'No predictions yet. Make your weekend picks now and adjust them any time before each session starts.',
  randomizeLabel = 'Quick randomize',
  isRandomizing = false,
  error = null,
  onRandomizeClick,
  onDismiss,
  makePicksControl,
}: UpcomingPredictionNudgeProps) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });

  return (
    <div className="border-b border-border bg-page px-3 py-2 sm:px-4 sm:py-3">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-surface shadow-sm">
          {onDismiss && (
            <button
              type="button"
              aria-label="Dismiss prediction banner"
              onClick={onDismiss}
              className="absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-surface/90 text-text-muted transition-colors hover:bg-surface hover:text-text sm:top-4 sm:right-4 sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div className="bg-gradient-to-r from-accent-muted/75 via-surface to-surface p-3 sm:p-5">
            <div className="grid gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-start gap-3 pr-10 sm:mb-3 sm:pr-12">
                  <span className="inline-flex items-center gap-2 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-accent shadow-sm">
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                    Weekend picks are open
                  </span>
                </div>
                <p className="font-title flex items-center gap-2 text-base font-semibold text-text sm:gap-3 sm:text-[1.75rem] sm:leading-none">
                  {countryCode && (
                    <span className="relative top-0.75 sm:top-0.5">
                      <span className="sm:hidden">
                        <CountryFlag code={countryCode} size="md" />
                      </span>
                      <span className="hidden sm:inline-block">
                        <CountryFlag code={countryCode} size="lg" />
                      </span>
                    </span>
                  )}
                  <span className="truncate">{raceName}</span>
                </p>
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-surface px-2.5 py-2 text-[13px] leading-relaxed text-text sm:mt-3 sm:px-3 sm:py-2.5 sm:text-[15px]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p>{message}</p>
                </div>
                {error && <p className="mt-1 text-xs text-error">{error}</p>}
                <div className="mt-3 flex flex-row flex-wrap gap-2 max-sm:flex-col sm:mt-4 [&>*]:w-full [&>*]:min-w-0 sm:[&>*]:w-auto">
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
                    {isRandomizing ? (
                      'Randomizing...'
                    ) : (
                      <>
                        <span className="sm:hidden">Randomize</span>
                        <span className="hidden sm:inline">
                          {randomizeLabel}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
