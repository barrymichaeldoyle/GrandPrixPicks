import { ArrowRight, Dices, Flag } from 'lucide-react';
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
  makePicksControl,
}: UpcomingPredictionNudgeProps) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });

  return (
    <div className="border-b border-border bg-page px-4 py-3">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-xl border border-accent/20 bg-surface shadow-sm">
          <div className="bg-gradient-to-r from-accent-muted/75 via-surface to-surface p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-surface/90 px-2.5 py-1 text-xs font-semibold text-accent shadow-sm">
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                    Weekend picks are open
                  </span>
                </div>
                <p className="font-title flex items-center gap-2 text-lg font-semibold text-text sm:gap-3 sm:text-[1.75rem] sm:leading-none">
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
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-surface/60 px-3 py-2.5 text-sm leading-relaxed text-text/85 sm:max-w-3xl sm:text-[15px]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p>
                    {message}
                  </p>
                </div>
                {error && <p className="mt-1 text-xs text-error">{error}</p>}
              </div>
              <div className="flex flex-col gap-2.5 lg:items-end">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
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
