import { Flag } from '@/components/Flag';
import { getCountryCodeForRace } from '@/lib/raceCountries';

/**
 * The lock deadline as a session clock, not a badge.
 *
 * This is the page's largest piece of data, so it is structural: GP name and
 * flag, what is locking, then the digits. Days/hours/minutes only — a seconds
 * column on a deadline three days out is noise that redraws sixty times a
 * minute, and the picker below it is where the attention should end up.
 */

type ClockSegment = { value: number; unit: string };

const ACCESSIBLE_UNITS = {
  D: ['day', 'days'],
  H: ['hour', 'hours'],
  M: ['minute', 'minutes'],
} as const;

function accessibleSegment({ value, unit }: ClockSegment) {
  const labels = ACCESSIBLE_UNITS[unit as keyof typeof ACCESSIBLE_UNITS];
  return `${value} ${value === 1 ? labels[0] : labels[1]}`;
}

function segmentsFor(msRemaining: number): ClockSegment[] {
  const totalMinutes = Math.max(0, Math.floor(msRemaining / 60_000));
  return [
    { value: Math.floor(totalMinutes / 1440), unit: 'D' },
    { value: Math.floor((totalMinutes % 1440) / 60), unit: 'H' },
    { value: totalMinutes % 60, unit: 'M' },
  ];
}

export function SessionClock({
  raceName,
  raceSlug,
  sessionLabel,
  msRemaining,
  size = 'lg',
}: {
  raceName: string;
  raceSlug: string;
  /** Session whose picks lock next, e.g. "Qualifying". */
  sessionLabel: string;
  msRemaining: number;
  size?: 'lg' | 'sm';
}) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });
  const locked = msRemaining <= 0;
  const segments = segmentsFor(msRemaining);
  const large = size === 'lg';

  return (
    <div>
      <p
        className={`flex items-center gap-2 font-medium tracking-label uppercase ${
          large ? 'text-sm' : 'text-xs'
        }`}
      >
        {countryCode ? (
          <Flag code={countryCode} size={large ? 'sm' : 'xs'} />
        ) : null}
        <span className="text-text">{raceName}</span>
      </p>

      <p className="gpp-label mt-2">
        {locked
          ? `${sessionLabel} picks are locked`
          : `${sessionLabel} picks lock in`}
      </p>

      {locked ? (
        <p
          className={`gpp-mono mt-2 text-text-muted ${large ? 'text-3xl' : 'text-xl'}`}
          suppressHydrationWarning
        >
          Locked
        </p>
      ) : (
        <div
          className="mt-2 flex items-start gap-3 sm:gap-4"
          suppressHydrationWarning
          role="timer"
          aria-label={`${sessionLabel} picks lock in ${segments
            .map(accessibleSegment)
            .join(', ')}`}
        >
          {segments.map((segment, index) => (
            <div key={segment.unit} className="flex items-start gap-3 sm:gap-4">
              {index > 0 ? (
                <span
                  className={`gpp-mono text-border-strong ${
                    large ? 'text-4xl sm:text-5xl' : 'text-xl'
                  }`}
                  aria-hidden="true"
                >
                  :
                </span>
              ) : null}
              <span className="flex flex-col items-center">
                <span
                  className={`gpp-mono leading-none font-light text-text ${
                    large ? 'text-4xl sm:text-5xl' : 'text-xl'
                  }`}
                >
                  {segment.value.toString().padStart(2, '0')}
                </span>
                <span
                  className={`gpp-label mt-1.5 ${large ? '' : 'text-[0.625rem]'}`}
                  aria-hidden="true"
                >
                  {segment.unit}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
