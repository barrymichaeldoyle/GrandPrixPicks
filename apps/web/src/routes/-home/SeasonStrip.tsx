import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { Flag as CountryFlag } from '@/components/Flag';
import { getCountryCodeForRace } from '@/lib/raceCountries';

type SeasonRace = Doc<'races'>;

// ISO 3166-1 alpha-2 → broadcast-style 3-letter race abbreviation.
// Falls back to upper-cased alpha-2 if unmapped.
const COUNTRY_CODE_3: Record<string, string> = {
  au: 'AUS',
  cn: 'CHN',
  jp: 'JPN',
  bh: 'BHR',
  sa: 'KSA',
  us: 'USA',
  ca: 'CAN',
  mc: 'MON',
  es: 'ESP',
  at: 'AUT',
  gb: 'GBR',
  be: 'BEL',
  hu: 'HUN',
  nl: 'NED',
  it: 'ITA',
  sg: 'SGP',
  mx: 'MEX',
  br: 'BRA',
  qa: 'QAT',
  ae: 'UAE',
  pt: 'POR',
  az: 'AZE',
};

function countryAbbr(code: string | null): string {
  if (!code) {
    return '—';
  }
  return COUNTRY_CODE_3[code.toLowerCase()] ?? code.toUpperCase();
}

export function SeasonStrip({
  races,
  currentRaceId,
  season,
  now,
}: {
  races: readonly SeasonRace[];
  currentRaceId: SeasonRace['_id'] | null;
  season: number | null;
  now: number;
}) {
  const sorted = races
    .filter(
      (r) =>
        r.round > 0 &&
        r.status !== 'cancelled' &&
        (season == null || r.season === season),
    )
    .sort((a, b) => a.round - b.round);
  const currentIndex = currentRaceId
    ? sorted.findIndex((r) => r._id === currentRaceId)
    : -1;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLLIElement>(null);

  // The strip overflows well past the viewport on phones, so the live round
  // would otherwise start off-screen. Centre it in the scroller directly rather
  // than via scrollIntoView, which would also scroll the page.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const step = currentStepRef.current;
    if (!scroller || !step) {
      return;
    }
    const target =
      step.offsetLeft - scroller.clientWidth / 2 + step.offsetWidth / 2;
    scroller.scrollLeft = Math.max(0, target);
  }, [currentRaceId]);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="gpp-label">2026 Season</h2>
        <Link
          to="/races"
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          All races →
        </Link>
      </div>
      <div
        ref={scrollerRef}
        className="-mx-3 [scrollbar-width:none] overflow-x-auto px-3 pb-2 [&::-webkit-scrollbar]:hidden"
      >
        <ol className="flex min-w-max items-center gap-1.5 sm:gap-2">
          {sorted.map((race, i) => {
            const isCurrent = race._id === currentRaceId;
            const isPast =
              !isCurrent &&
              race.raceStartAt < now &&
              race.status !== 'cancelled';
            const code = getCountryCodeForRace(race);
            const label = `Round ${race.round}: ${race.name}`;
            return (
              <li
                key={race._id}
                ref={isCurrent ? currentStepRef : undefined}
                className="flex flex-col items-center"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <Link
                  to="/races/$raceSlug"
                  params={{ raceSlug: race.slug }}
                  search={{ from: 'home' }}
                  aria-label={label}
                  title={label}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-sm border transition-colors duration-150 ease-out sm:h-11 sm:w-11 ${
                    isCurrent
                      ? 'gpp-stripe border-accent-hairline bg-surface-elevated'
                      : isPast
                        ? 'border-border/60 opacity-50 hover:opacity-90'
                        : 'border-border/60 hover:border-border-strong'
                  }`}
                >
                  {code ? (
                    <CountryFlag
                      code={code}
                      size="md"
                      className="overflow-hidden rounded-sm"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-text-muted">
                      {race.round}
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-page bg-accent"
                      aria-hidden="true"
                    />
                  )}
                </Link>
                <span
                  className={`mt-1 text-xs font-semibold tracking-label ${
                    isCurrent
                      ? 'text-text-muted'
                      : isPast
                        ? 'text-text-muted/80'
                        : 'text-text-muted'
                  }`}
                >
                  {countryAbbr(code)}
                </span>
                {i < sorted.length - 1 && (
                  <span className="sr-only" aria-hidden="true">
                    ·
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-1 text-xs text-text-muted sm:hidden">
        Swipe to explore the full season
      </p>
      {currentIndex >= 0 && (
        <p className="mt-1 text-center text-xs text-text-muted sm:text-left">
          Round {sorted[currentIndex]!.round} of {sorted.length} ·{' '}
          {sorted.length -
            currentIndex -
            (sorted[currentIndex]!.status === 'finished' ? 0 : 1)}{' '}
          races remaining
        </p>
      )}
    </div>
  );
}
