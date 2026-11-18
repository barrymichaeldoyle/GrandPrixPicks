import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

import { Flag } from '@/components/Flag';
import { getCircuitLap } from '@/lib/circuitLaps';
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
  nextRace,
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
  nextRace?: { slug: string; name: string } | null;
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
  const [titleLead, titleTail] = splitHeroTitle(title);
  const lap = getCircuitLap(getCircuitForRace(raceSlug)?.slug);
  return (
    // A full-bleed band under the header, in the display register as the
    // landing hero is: the page colour (the schedule card's `bg-surface`
    // still reads as lifted off it), the race name in black-weight type, and
    // the lap drawn in behind it where we have one. Its content keeps to the
    // header's frame, so the flag lines up under the logo and the schedule
    // card's right edge under the header's last button.
    <div className="relative overflow-hidden border-b border-border bg-page">
      <div className="mx-auto grid max-w-(--page-max) gap-8 px-4 pt-6 pb-8 sm:pt-12 sm:pb-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16 lg:py-16 xl:gap-24">
        <header className="relative">
          {lap ? (
            <svg
              className="gpp-hero-lap"
              viewBox={`-30 -30 ${lap.width + 60} ${lap.height + 60}`}
              aria-hidden="true"
              focusable="false"
            >
              <path className="gpp-hero-lap-asphalt" d={lap.d} />
              <path className="gpp-hero-lap-line" d={lap.d} pathLength={1000} />
              <path className="gpp-hero-lap-car" d={lap.d} pathLength={1000} />
            </svg>
          ) : null}
          <div className="relative">
            <div className="flex items-center gap-3">
              <Flag code={flagCode} size="xl" shear className="gpp-hero-flag" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted">{eyebrow}</p>
                {/* Only where the eyebrow fits on one line. A phone wraps before
                  the phase label, and a separator is punctuation between two
                  things on the same line: dropped to the next one it becomes a
                  dot opening a sentence. The line break separates them. */}
                <span
                  className="hidden text-text-disabled sm:inline"
                  aria-hidden
                >
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            {/* Hero-scale type, so the break is authored rather than balanced:
              the race on one line, what this page is about on the next
              (`docs/product-voice.md`, "Line breaks"). The space between the
              spans keeps the accessible name and the search snippet whole. */}
            <h1 className="mt-6 text-text">
              {titleTail ? (
                <>
                  <span className="gpp-display gpp-display-writeup block">
                    {titleLead}
                  </span>{' '}
                  <span className="gpp-display gpp-display-light gpp-display-writeup mt-[0.12em] block text-text-muted">
                    {titleTail}
                  </span>
                </>
              ) : (
                <span className="gpp-display gpp-display-writeup block">
                  {title}
                </span>
              )}
            </h1>
            <p className="gpp-reading-copy-lg mt-6 max-w-2xl text-text-muted">
              {summary}
            </p>
            <RaceWriteupActions
              phase={phase}
              primaryActionTargetId={primaryActionTargetId}
              raceSlug={raceSlug}
              nextRace={nextRace}
              venueName={venueName}
              signalsHeading={signalsHeading}
            />
          </div>
        </header>

        <RaceWriteupWeekendSchedule
          race={schedule.race}
          timeZone={schedule.timeZone}
          timeZoneLabel={schedule.timeZoneLabel}
          // Live, it is the forecast for sessions still to run. Finished, it is
          // the weather they ran in: `weather.getForWriteup` only returns a
          // finished weekend when every session is covered. Before the weekend
          // opens and when it is called off there is nothing to show.
          weather={
            isRaceWriteupLive(phase) || phase === 'finished'
              ? schedule.weather
              : null
          }
          now={schedule.now}
        />
      </div>
    </div>
  );
}

/**
 * "Singapore Grand Prix" / "2026 predictions": the race on the first line and
 * the rest on the second. Every write-up title names a Grand Prix, so that is
 * the seam; a title without one renders as written.
 */
function splitHeroTitle(title: string): [string, string | null] {
  const seam = title.indexOf('Grand Prix');
  if (seam === -1) {
    return [title, null];
  }
  const end = seam + 'Grand Prix'.length;
  const tail = title.slice(end).trim();
  return tail ? [title.slice(0, end), tail] : [title, null];
}
