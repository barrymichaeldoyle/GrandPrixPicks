import type { WeatherTimeToggleProps } from './WeatherTimeToggle';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import type {
  buildWeatherSessions,
  RaceWeather,
} from '@/lib/weatherPresentation';

import { WeatherAttribution } from './WeatherAttribution';
import { WeekendWeatherHoursModal } from './WeekendWeatherHoursModal';

type RaceSchedule = Parameters<typeof buildWeatherSessions>[0];

/**
 * Everything about the weekend's weather that a schedule row cannot carry.
 *
 * Three things, in the order they matter: an alert about the hours either side
 * of the next session, which is the one weather fact a per-session figure
 * cannot express; a way into the hour-by-hour model output; and the provider's
 * attribution, which its licence requires and which is the reason this block
 * exists at all rather than the numbers simply appearing on the schedule
 * unsourced.
 *
 * The hours open in a modal rather than expanding in place. Folded into the
 * card they were a three-day, eighteen-cell grid squeezed into a column width,
 * and opening them shunted the rest of the write-up off screen. The trade is
 * that the hours are no longer in the server-rendered HTML: the per-session
 * forecast on the schedule above is, and that is the part a crawler or a
 * reader without JavaScript actually wants.
 */
export function WeekendWeatherDetail({
  weather,
  race,
  now,
  alert,
  timeZoneLabel,
  timeZone,
  showToggle,
  showViewerTime,
  onTimeViewChange,
}: {
  weather: RaceWeather;
  race: RaceSchedule;
  now: number;
  alert: string | null;
  timeZoneLabel: string;
  timeZone: string;
  showToggle: boolean;
} & WeatherTimeToggleProps) {
  const [hoursOpen, setHoursOpen] = useState(false);
  const { isStale } = weather;

  return (
    <div className="border-t border-border">
      {(alert || isStale) && (
        <div className="border-b border-border px-4 py-3">
          {alert && <p className="text-sm leading-6 text-text">{alert}</p>}
          {isStale && (
            <p className={`text-sm text-error ${alert ? 'mt-1' : ''}`}>
              The latest refresh failed, so this is the most recent available
              forecast.
            </p>
          )}
        </div>
      )}

      {/* A row of the sheet, not a button on it. A bordered button inside the
          card's own border read as a box in a box; as a full-bleed row it has
          the same gutter, height and rule as the sessions above it, and the
          chevron is what says it goes somewhere. */}
      <button
        type="button"
        onClick={() => setHoursOpen(true)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <CalendarClock
          className="h-4 w-4 shrink-0 text-text-muted"
          aria-hidden
        />
        <span className="flex-1">Hour-by-hour forecast</span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-text-muted"
          aria-hidden
        />
      </button>

      <WeekendWeatherHoursModal
        open={hoursOpen}
        onClose={() => setHoursOpen(false)}
        weather={weather}
        race={race}
        now={now}
        timeZoneLabel={timeZoneLabel}
        timeZone={timeZone}
        showToggle={showToggle}
        showViewerTime={showViewerTime}
        onTimeViewChange={onTimeViewChange}
      />

      {/* The foot of the sheet mirrors its head: small, left-aligned, under a
          rule. */}
      <WeatherAttribution
        weather={weather}
        now={now}
        className="border-t border-border px-4 py-2"
      />
    </div>
  );
}
