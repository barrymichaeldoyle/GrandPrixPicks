import { Flag } from '@/components/Flag';
import {
  isRaceWriteupLive,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';
import type { RaceWeather } from '@/lib/weatherPresentation';

import { RaceWriteupActions } from './RaceWriteupActions';
import { RaceWriteupPhaseLabel } from './RaceWriteupPhaseLabel';
import { RaceWriteupWeekendSchedule } from './RaceWriteupWeekendSchedule';

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

/**
 * The write-up's opening: identity, phase, the call to pick, and the schedule.
 *
 * Five pages had grown five copies of this grid, and the copies had already
 * drifted: two hid the eyebrow separator on a phone (a wrapped dot opening a
 * sentence) and three did not. One shell, so the next write-up cannot ship
 * the older shape.
 */
export function RaceWriteupHero({
  flagCode,
  eyebrow,
  title,
  summary,
  phase,
  raceSlug,
  venueName,
  primaryActionTargetId,
  signalsHeading,
  schedule,
}: {
  flagCode: string;
  /** Dates, venue and round, e.g. "11–13 Sep · Madring · Round 15". */
  eyebrow: string;
  title: string;
  summary: string;
  phase: RaceWriteupPhase;
  raceSlug: string;
  venueName: string;
  primaryActionTargetId?: string;
  signalsHeading?: string;
  schedule: {
    race: ScheduleRace;
    timeZone: string;
    timeZoneLabel: string;
    weather?: RaceWeather | null;
    now?: number;
  };
}) {
  return (
    // No rule under the stacked hero: the schedule card already draws a
    // full frame, and a second line below it was a divider with nothing
    // left to divide. Side by side at `lg`, the rule spans both columns
    // and is the break before the body.
    <div className="grid gap-8 pb-8 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:border-b lg:border-border">
      <header>
        <div className="flex items-center gap-3">
          <Flag code={flagCode} size="xl" />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="gpp-mono text-sm text-text-muted">{eyebrow}</p>
            {/* Only where the eyebrow fits on one line. A phone wraps before
                the phase label, and a separator is punctuation between two
                things on the same line: dropped to the next one it becomes a
                dot opening a sentence. The line break separates them. */}
            <span className="hidden text-text-disabled sm:inline" aria-hidden>
              ·
            </span>
            <RaceWriteupPhaseLabel phase={phase} />
          </div>
        </div>
        <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
          {title}
        </h1>
        <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
          {summary}
        </p>
        <RaceWriteupActions
          phase={phase}
          primaryActionTargetId={primaryActionTargetId}
          raceSlug={raceSlug}
          venueName={venueName}
          signalsHeading={signalsHeading}
        />
      </header>

      <RaceWriteupWeekendSchedule
        race={schedule.race}
        timeZone={schedule.timeZone}
        timeZoneLabel={schedule.timeZoneLabel}
        weather={isRaceWriteupLive(phase) ? schedule.weather : null}
        now={schedule.now}
      />
    </div>
  );
}
