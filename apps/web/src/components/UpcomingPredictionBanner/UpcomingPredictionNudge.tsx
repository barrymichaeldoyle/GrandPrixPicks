import { ArrowRight, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { Flag as CountryFlag } from '../Flag';
import { getCountryCodeForRace } from '../RaceCard';

const EXIT_ANIMATION_MS = 320;

interface UpcomingPredictionNudgeProps {
  raceName: string;
  raceSlug: string;
  ctaLabel?: string;
  onDismiss?: () => void;
}

export function UpcomingPredictionNudge({
  raceName,
  raceSlug,
  ctaLabel = 'Make picks',
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
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug }}
          className="group relative mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 pr-10"
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {countryCode && (
            <span className="flex shrink-0 overflow-hidden rounded-sm ring-1 ring-black/10">
              <CountryFlag code={countryCode} size="md" />
            </span>
          )}
          <span className="font-title min-w-0 flex-1 truncate text-sm leading-none font-semibold text-text group-hover:text-accent">
            {raceName}
          </span>
          <span className="shrink-0 text-xs leading-none font-semibold text-accent">
            {ctaLabel}
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent" />
        </Link>
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss prediction banner"
            onClick={handleDismiss}
            disabled={isExiting}
            className="absolute top-1/2 right-2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
