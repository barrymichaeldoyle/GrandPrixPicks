type ScheduleRace = {
  fp1StartAt?: number;
  fp2StartAt?: number;
  fp3StartAt?: number;
  hasSprint?: boolean;
  sprintQualiStartAt?: number;
  sprintStartAt?: number;
  qualiStartAt?: number;
  raceStartAt: number;
};

function formatTrackTime(timestamp: number | undefined, timeZone: string) {
  if (timestamp === undefined) {
    return 'To be confirmed';
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
    timeZoneName: 'short',
  }).format(timestamp);
}

export function RaceWriteupWeekendSchedule({
  race,
  timeZone,
  timeZoneLabel,
}: {
  race: ScheduleRace;
  timeZone: string;
  timeZoneLabel: string;
}) {
  const sessions: readonly (readonly [string, number | undefined])[] =
    race.hasSprint
      ? [
          ['Practice 1', race.fp1StartAt],
          ['Sprint Qualifying', race.sprintQualiStartAt],
          ['Sprint', race.sprintStartAt],
          ['Qualifying', race.qualiStartAt],
          ['Grand Prix', race.raceStartAt],
        ]
      : [
          ['Practice 1', race.fp1StartAt],
          ['Practice 2', race.fp2StartAt],
          ['Practice 3', race.fp3StartAt],
          ['Qualifying', race.qualiStartAt],
          ['Grand Prix', race.raceStartAt],
        ];

  return (
    <section
      aria-labelledby="weekend-timing"
      className="rounded-sm bg-surface-elevated"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 sm:py-3">
        <h2 id="weekend-timing" className="font-title font-medium text-text">
          Weekend schedule
        </h2>
        <span className="gpp-mono text-xs text-text-muted">
          {timeZoneLabel}
        </span>
      </div>
      <dl>
        {sessions.map(([label, timestamp]) => (
          <div
            key={label}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 border-b border-border/60 px-4 py-2 last:border-b-0 sm:grid-cols-[6.5rem_1fr] sm:py-2.5"
          >
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd className="gpp-mono text-right text-sm text-text">
              {formatTrackTime(timestamp, timeZone)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
