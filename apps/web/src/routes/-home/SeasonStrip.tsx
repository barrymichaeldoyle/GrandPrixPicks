import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';

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
  races: ReadonlyArray<SeasonRace>;
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

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-widest text-text-muted uppercase">
          2026 Season
        </p>
        <Link
          to="/races"
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          All races →
        </Link>
      </div>
      <div className="-mx-3 [scrollbar-width:none] overflow-x-auto px-3 pb-2 [&::-webkit-scrollbar]:hidden">
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
                className="flex flex-col items-center"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <Link
                  to="/races/$raceSlug"
                  params={{ raceSlug: race.slug }}
                  search={{ from: 'home' }}
                  aria-label={label}
                  title={label}
                  className={`group home-season-step relative flex h-10 w-10 items-center justify-center rounded-full border transition sm:h-11 sm:w-11 ${
                    isCurrent
                      ? 'home-season-step-current border-accent shadow-[0_0_0_3px_rgba(34,211,238,0.18)]'
                      : isPast
                        ? 'home-season-step-past border-border/60 hover:opacity-90'
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
                    <span className="text-[10px] font-semibold text-text-muted">
                      {race.round}
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-pulse rounded-full bg-accent shadow-[0_0_0_2px_var(--page)]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
                <span
                  className={`mt-1 text-[10px] font-semibold tracking-wide ${
                    isCurrent
                      ? 'text-accent'
                      : isPast
                        ? 'text-text-muted/55'
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
      {currentIndex >= 0 && (
        <p className="mt-1 text-center text-[11px] text-text-muted sm:text-left">
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
