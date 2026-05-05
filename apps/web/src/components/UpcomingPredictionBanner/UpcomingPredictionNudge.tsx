import { ArrowRight, Dices, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { Flag as CountryFlag } from '../Flag';
import { getCountryCodeForRace } from '../RaceCard';

const EXIT_ANIMATION_MS = 320;

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
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDismiss() {
    if (isExiting || !onDismiss) {
      return;
    }
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      onDismiss();
    }, EXIT_ANIMATION_MS);
  }

  return (
    <div className={isExiting ? 'banner-drop-out' : 'banner-drop-in'}>
      <div className="banner-drop-inner relative border-b border-border bg-surface/60">
        <div
          aria-hidden="true"
          className="banner-rail-sweep pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/8 via-transparent to-transparent"
        />

        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss prediction banner"
            onClick={handleDismiss}
            disabled={isExiting}
            className="absolute top-2.5 right-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text sm:top-3 sm:right-4"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3.5 pr-10 sm:flex-row sm:items-center sm:gap-5 sm:py-4 sm:pr-14 sm:pl-6">
          {countryCode && (
            <div className="hidden shrink-0 overflow-hidden rounded-md shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/20 sm:block">
              <CountryFlag code={countryCode} size="xl" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.18em] text-accent uppercase">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span>Picks open</span>
              {countryCode && (
                <span className="ml-1 inline-flex overflow-hidden rounded-sm ring-1 ring-black/10 sm:hidden">
                  <CountryFlag code={countryCode} size="sm" />
                </span>
              )}
            </div>

            <h2 className="font-title mt-1 truncate text-xl leading-tight font-bold tracking-tight text-text sm:text-2xl">
              {raceName}
            </h2>

            <p className="mt-1 text-[13px] leading-snug text-text-muted sm:text-sm">
              {message}
            </p>

            {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
          </div>

          <div className="flex flex-row flex-wrap gap-2 sm:shrink-0 sm:flex-nowrap [&>*]:flex-1 sm:[&>*]:flex-none">
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
                  <span className="hidden sm:inline">{randomizeLabel}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
