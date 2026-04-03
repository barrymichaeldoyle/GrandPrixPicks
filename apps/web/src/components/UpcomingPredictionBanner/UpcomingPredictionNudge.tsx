import { ArrowRight, Dices, Flag, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { Button } from '../Button/Button';
import { Flag as CountryFlag } from '../Flag';
import { getCountryCodeForRace } from '../RaceCard';

interface UpcomingPredictionNudgeProps {
  raceName: string;
  raceSlug: string;
  message?: string;
  randomizeLabel?: string;
  isRandomizing?: boolean;
  error?: string | null;
  onRandomizeClick?: () => void;
  onDismiss?: () => void;
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
}: UpcomingPredictionNudgeProps) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });

  return (
      <div className="mx-auto max-w-7xl relative overflow-hidden border border-accent/16 bg-gradient-to-r from-accent-muted/55 via-surface to-surface shadow-sm">
          {onDismiss && (
            <button
              type="button"
              aria-label="Dismiss prediction banner"
              onClick={onDismiss}
              className="absolute top-2.5 right-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface/85 hover:text-text sm:top-3 sm:right-3"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div className="p-3 pr-10 sm:px-4 sm:py-3 sm:pr-12">
              <div className="min-w-0">
                <div className="mb-1 flex items-start gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent/14 bg-surface/88 px-2 py-0.5 text-[11px] font-semibold text-accent shadow-sm">
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                    Picks open
                  </span>
                </div>
                <p className="font-title flex items-center gap-2 text-base font-semibold text-text sm:gap-2.5 sm:text-[1.35rem]">
                  {countryCode && (
                    <span className="relative top-0.5 shrink-0 sm:top-0">
                      <span className="sm:hidden">
                        <CountryFlag code={countryCode} size="md" />
                      </span>
                      <span className="hidden sm:inline-block">
                        <CountryFlag code={countryCode} size="md" />
                      </span>
                    </span>
                  )}
                  <span className="truncate">{raceName}</span>
                </p>
                <div className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-text-muted sm:mt-1.5 sm:text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p>{message}</p>
                </div>
                {error && <p className="mt-1 text-xs text-error">{error}</p>}
                <div className="mt-3 flex flex-row flex-wrap gap-2 max-sm:flex-col sm:mt-3 [&>*]:w-full [&>*]:min-w-0 sm:[&>*]:w-auto">
                  <Button asChild size="sm" rightIcon={ArrowRight}>
                    <Link to="/races/$raceSlug" params={{ raceSlug }}>
                      Make picks
                    </Link>
                  </Button>
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
      
  );
}
