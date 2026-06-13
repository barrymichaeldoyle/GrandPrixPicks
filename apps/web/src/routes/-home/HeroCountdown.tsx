import { getCountdownParts } from '@grandprixpicks/shared/dates';

const COUNTDOWN_DIGIT_CLASS =
  'home-countdown-digit font-title flex h-[clamp(2.6rem,12.5vw,3.5rem)] w-[clamp(1.7rem,9vw,2.5rem)] items-center justify-center rounded-md text-[clamp(1.7rem,8.5vw,2.5rem)] leading-none font-bold text-text sm:h-[5.25rem] sm:w-[3.75rem] sm:rounded-lg sm:text-[4rem]';

function TimeUnit({ value, label }: { value: number; label: string }) {
  const [tens, ones] = String(value).padStart(2, '0').split('') as [
    string,
    string,
  ];
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-2.5">
      <div className="home-countdown-group flex gap-1 sm:gap-1.5">
        <span className={COUNTDOWN_DIGIT_CLASS}>{tens}</span>
        <span className={COUNTDOWN_DIGIT_CLASS}>{ones}</span>
      </div>
      <span className="text-[10px] font-semibold tracking-[0.22em] text-text-muted uppercase sm:text-[11px] sm:tracking-widest">
        {label}
      </span>
    </div>
  );
}

function CountdownSeparator() {
  return (
    <span className="home-countdown-sep mb-5 flex flex-col items-center justify-center gap-1.5 self-center sm:mb-7 sm:gap-2">
      <span className="block h-1 w-1 rounded-full bg-accent sm:h-1.5 sm:w-1.5" />
      <span className="block h-1 w-1 rounded-full bg-accent sm:h-1.5 sm:w-1.5" />
    </span>
  );
}

export function BigCountdown({
  targetAt,
  now,
}: {
  targetAt: number;
  now: number;
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
      className="flex items-start justify-center gap-2 sm:gap-5"
      suppressHydrationWarning
    >
      {days > 0 && (
        <>
          <TimeUnit value={days} label="days" />
          <CountdownSeparator />
        </>
      )}
      <TimeUnit value={hours} label="hrs" />
      <CountdownSeparator />
      <TimeUnit value={minutes} label="min" />
      <CountdownSeparator />
      <TimeUnit value={seconds} label="sec" />
    </div>
  );
}
