import {
  buildWeatherSessions,
  nextWeatherSession,
  sessionWeatherLine,
  summarizeSessionWindow,
  type RaceWeather,
  type WeatherSession,
  type WeatherWindowSummary,
} from '@/lib/weatherPresentation';

import { WeatherIcon } from './WeatherIcon';

type RaceSchedule = Parameters<typeof buildWeatherSessions>[0] & {
  slug: string;
};

/**
 * The weekend forecast as one row of the picks card.
 *
 * Rain is an input to a pick, so it belongs beside the picks rather than in the
 * feed, where it used to sit above a chronological list as a permanent card and
 * drifted further from the fold as a race week filled up with news.
 *
 * Which session it describes follows the card's selected tab, falling back to
 * the next one still ahead: a tab whose session has already run has dropped out
 * of the forecast window, and an empty row would appear and disappear as a
 * player moved along the strip.
 */
export function WeatherSessionLine({
  race,
  weather,
  now,
  sessionKey,
}: {
  race?: RaceSchedule | null;
  weather: RaceWeather | null | undefined;
  now: number;
  /** The session tab on screen, matched against the weather session keys
   *  (`quali`, `sprint`, `race`, ...), which are the same strings. */
  sessionKey?: string | null;
}) {
  if (!race || !weather || weather.forecast.raceSlug !== race.slug) {
    return null;
  }

  const { forecast, isStale } = weather;
  const sessions = buildWeatherSessions(race);
  const resolved = [
    sessionKey ? sessions.find((session) => session.key === sessionKey) : null,
    nextWeatherSession(sessions, now),
  ].reduce<{ session: WeatherSession; summary: WeatherWindowSummary } | null>(
    (found, session) => {
      if (found || !session) {
        return found;
      }
      const summary = summarizeSessionWindow(forecast, session);
      return summary ? { session, summary } : null;
    },
    null,
  );

  if (!resolved) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2.5 sm:px-5">
      <WeatherIcon
        conditionCode={resolved.summary.conditionCode}
        className="size-4 shrink-0 text-text-muted"
      />
      {/* The tab strip above has already named the session, so this only
          repeats it when the row has fallen back to a different one. Naming it
          twice cost a phone the second line of the row. */}
      <span className="gpp-label text-text-muted">
        {resolved.session.key === sessionKey
          ? 'Forecast'
          : `${resolved.session.label} forecast`}
        {isStale ? ' (last available)' : ''}
      </span>
      <span className="gpp-mono ml-auto text-xs text-text">
        {sessionWeatherLine(resolved.summary)}
      </span>
    </div>
  );
}
