import { X } from 'lucide-react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';

import { useModalDialog } from '@/hooks/useModalDialog';
import type {
  buildWeatherSessions,
  RaceWeather,
} from '@/lib/weatherPresentation';

import { WeatherAttribution } from './WeatherAttribution';
import { WeekendWeatherHours } from './WeekendWeatherHours';

type RaceSchedule = Parameters<typeof buildWeatherSessions>[0];

/**
 * The hour grid on a surface big enough to hold it.
 *
 * Inline, this was three days of six cells folded into a `<details>` under the
 * schedule: opening it pushed the rest of the write-up down a screen and the
 * cells had a card's width to share. A modal gives the grid the whole viewport
 * and leaves the page underneath as it was.
 */
export function WeekendWeatherHoursModal({
  open,
  onClose,
  weather,
  race,
  now,
  timeZoneLabel,
}: {
  open: boolean;
  onClose: () => void;
  weather: RaceWeather;
  race: RaceSchedule;
  now: number;
  timeZoneLabel: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    initialFocusRef: closeButtonRef,
  });

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekend-weather-hours-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2
            id="weekend-weather-hours-title"
            className="font-title font-medium text-text"
          >
            Hour-by-hour forecast
          </h2>
          <div className="flex items-center gap-3">
            <span className="gpp-mono text-xs text-text-muted uppercase">
              {timeZoneLabel}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded p-1 text-text-muted hover:text-text"
              aria-label="Close hour-by-hour forecast"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 py-4">
          <WeekendWeatherHours weather={weather} race={race} now={now} />
        </div>
        <div className="border-t border-border px-4 py-3">
          <WeatherAttribution weather={weather} now={now} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
