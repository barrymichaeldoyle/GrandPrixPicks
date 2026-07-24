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
  const digitClass = compact
    ? 'home-countdown-digit font-title flex h-[clamp(2.35rem,10.5vw,3rem)] w-[clamp(1.55rem,7.5vw,2.1rem)] items-center justify-center rounded-md text-[clamp(1.45rem,7vw,2rem)] leading-none font-bold text-text sm:h-14 sm:w-10 sm:text-[2.5rem]'
    : 'home-countdown-digit font-title flex h-[clamp(2.6rem,12.5vw,3.5rem)] w-[clamp(1.7rem,9vw,2.5rem)] items-center justify-center rounded-md text-[clamp(1.7rem,8.5vw,2.5rem)] leading-none font-bold text-text sm:h-[5.25rem] sm:w-[3.75rem] sm:rounded-lg sm:text-[4rem]';

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
      <span className="text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase sm:text-[11px]">
        {label}
      </span>
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
      <CountdownSeparator compact={compact} />
      <TimeUnit value={seconds} label="sec" compact={compact} />
    </div>
  );
}
