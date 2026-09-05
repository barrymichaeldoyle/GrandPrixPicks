import { CalendarClock } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
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
}: {
  weather: RaceWeather;
  race: RaceSchedule;
  now: number;
  alert: string | null;
  timeZoneLabel: string;
}) {
  const [hoursOpen, setHoursOpen] = useState(false);
  const { isStale } = weather;

  return (
    <div className="border-t border-border px-4 py-3">
      {(alert || isStale) && (
        <div className="mb-3">
          {alert && <p className="text-sm leading-6 text-text">{alert}</p>}
          {isStale && (
            <p className={`text-sm text-error ${alert ? 'mt-1' : ''}`}>
              The latest refresh failed, so this is the most recent available
              forecast.
            </p>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={CalendarClock}
        onClick={() => setHoursOpen(true)}
      >
        Hour-by-hour forecast
      </Button>

      <WeekendWeatherHoursModal
        open={hoursOpen}
        onClose={() => setHoursOpen(false)}
        weather={weather}
        race={race}
        now={now}
        timeZoneLabel={timeZoneLabel}
      />

      <WeatherAttribution weather={weather} now={now} className="mt-3" />
    </div>
  );
}
