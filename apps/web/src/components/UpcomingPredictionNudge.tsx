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
              className="absolute top-2 right-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-surface/90 text-text-muted transition-colors hover:bg-surface hover:text-text sm:top-3 sm:right-3 sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div className="bg-gradient-to-r from-accent-muted/75 via-surface to-surface p-3 sm:p-5">
            <div className="grid gap-3 pr-8 sm:gap-4 sm:pr-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:pr-12">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center sm:mb-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-surface/90 px-2.5 py-1 text-xs font-semibold text-accent shadow-sm">
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
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-2 text-[13px] leading-relaxed text-text/85 sm:mt-3 sm:max-w-3xl sm:px-3 sm:py-2.5 sm:text-[15px]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p>{message}</p>
                </div>
                {error && <p className="mt-1 text-xs text-error">{error}</p>}
              </div>
              <div className="flex flex-col gap-2 lg:items-end">
                <div className="grid grid-cols-2 gap-2 lg:flex">
                  <div className="w-full lg:w-auto [&>*]:w-full lg:[&>*]:w-auto">
                    {makePicksControl ?? (
                      <Button
                        size="sm"
                        rightIcon={ArrowRight}
                        className="w-full"
                      >
                        Make picks
                      </Button>
                    )}
                  </div>
                  <div className="w-full lg:w-auto [&>*]:w-full lg:[&>*]:w-auto">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={Dices}
                      className="w-full"
                      disabled={isRandomizing}
                      onClick={onRandomizeClick}
                    >
                      {isRandomizing ? 'Randomizing...' : randomizeLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
