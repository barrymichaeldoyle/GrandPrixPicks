import { getCountdownParts } from '@grandprixpicks/shared/dates';

function TimeUnit({
  value,
  label,
  compact,
}: {
  value: number;
  label: string;
  compact: boolean;
}) {
  const [tens, ones] = String(value).padStart(2, '0').split('') as [
    string,
    string,
  ];
  /*
   * The countdown is the largest number on the site, so it is mono and
   * tabular like every other figure — digits must not jitter as they tick.
   *
   * The flip-clock "tiles" are gone: each digit was a raised surface with an
   * inset shadow and a red-tinted border, which is three of this system's
   * rules broken on one element. The digits now sit directly on the page and
   * get their presence from size alone.
   */
  const digitClass = compact
    ? 'gpp-mono flex h-[clamp(2.35rem,10.5vw,3rem)] w-[clamp(1.55rem,7.5vw,2.1rem)] items-center justify-center text-[clamp(1.45rem,7vw,2rem)] leading-none font-normal text-text sm:h-14 sm:w-10 sm:text-[2.5rem]'
    : 'gpp-mono flex h-[clamp(2.6rem,12.5vw,3.5rem)] w-[clamp(1.7rem,9vw,2.5rem)] items-center justify-center text-[clamp(1.7rem,8.5vw,2.5rem)] leading-none font-normal text-text sm:h-[5.25rem] sm:w-[3.75rem] sm:text-[var(--data-xl)]';

  return (
    <div
      className={`flex min-w-0 flex-col items-center ${
        compact ? 'gap-1.5' : 'gap-2 sm:gap-2.5'
      }`}
    >
      <div className="home-countdown-group flex gap-1 sm:gap-1.5">
        <span className={digitClass}>{tens}</span>
        <span className={digitClass}>{ones}</span>
      </div>
      <span className="gpp-label">{label}</span>
    </div>
  );
}

function CountdownSeparator({ compact }: { compact: boolean }) {
  return (
    <span
      className={`home-countdown-sep flex flex-col items-center justify-center gap-1.5 self-center ${
        compact ? 'mb-4 sm:mb-5' : 'mb-5 sm:mb-7 sm:gap-2'
      }`}
    >
      <span className="block h-1 w-1 rounded-full bg-accent sm:h-1.5 sm:w-1.5" />
      <span className="block h-1 w-1 rounded-full bg-accent sm:h-1.5 sm:w-1.5" />
    </span>
  );
}

export function BigCountdown({
  targetAt,
  now,
  compact = false,
}: {
  targetAt: number;
  now: number;
  compact?: boolean;
}) {
  const parts = getCountdownParts(targetAt - now);

  if (!parts) {
    return (
      <p className="text-lg font-semibold text-accent" suppressHydrationWarning>
        Starting now
      </p>
    );
  }

  const { days, hours, minutes, seconds } = parts;

  return (
    <div
      className={`flex items-start justify-center ${
        compact ? 'gap-1.5 sm:gap-2.5' : 'gap-2 sm:gap-5'
      }`}
      suppressHydrationWarning
    >
      {days > 0 && (
        <>
          <TimeUnit value={days} label="days" compact={compact} />
          <CountdownSeparator compact={compact} />
        </>
      )}
      <TimeUnit value={hours} label="hrs" compact={compact} />
      <CountdownSeparator compact={compact} />
      <TimeUnit value={minutes} label="min" compact={compact} />
      {days === 0 && (
        <>
          <CountdownSeparator compact={compact} />
          <TimeUnit value={seconds} label="sec" compact={compact} />
        </>
      )}
    </div>
  );
}
