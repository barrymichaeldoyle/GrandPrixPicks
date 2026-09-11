import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { RaceWeather, WeatherHour } from '@/lib/weatherPresentation';

import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { WeekendWeatherHours } from '@/components/weather/WeekendWeatherHours';

const HOUR = 60 * 60_000;

const fp1StartAt = Date.UTC(2026, 8, 4, 11, 30);
const fp2StartAt = Date.UTC(2026, 8, 4, 15);
const fp3StartAt = Date.UTC(2026, 8, 5, 10, 30);
const qualiStartAt = Date.UTC(2026, 8, 5, 14);
const raceStartAt = Date.UTC(2026, 8, 6, 13);

const race = {
  slug: 'italy-2026',
  name: 'Italian Grand Prix',
  fp1StartAt,
  fp2StartAt,
  fp3StartAt,
  qualiStartAt,
  raceStartAt,
};

/** Local hours 06:00 to 23:00 at Monza (UTC+2) for one event day. */
function hoursForDay(
  dayOffset: number,
  fromLocalHour = 6,
  toLocalHour = 23,
): WeatherHour[] {
  return Array.from({ length: 18 }, (_, index) => 6 + index)
    .filter(
      (localHour) => localHour >= fromLocalHour && localHour <= toLocalHour,
    )
    .map((localHour) => ({
      at: Date.UTC(2026, 8, 4 + dayOffset, localHour - 2),
      localDate: `2026-09-0${4 + dayOffset}`,
      localHour,
      forecastPeriodHours: 1,
      temperatureC: 24,
      conditionCode: 'clearsky_day',
      precipitationAmountMm: 0,
      precipitationProbability: 5,
      thunderProbability: 0,
      windSpeedMps: 3,
      windGustMps: 6,
    }));
}

function weatherWith(hours: WeatherHour[], now: number): RaceWeather {
  return {
    isStale: false,
    attribution: {
      name: 'MET Norway',
      url: 'https://www.met.no/en',
      licenseName: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    forecast: {
      raceSlug: 'italy-2026',
      timeZone: 'Europe/Rome',
      provider: 'met_no',
      providerUpdatedAt: now - HOUR,
      fetchedAt: now - HOUR,
      checkedAt: now - HOUR,
      expiresAt: now + HOUR,
      eventDates: ['2026-09-04', '2026-09-05', '2026-09-06'],
      hours,
      days: [...new Set(hours.map((hour) => hour.localDate))].map(
        (localDate) => ({
          localDate,
          minTemperatureC: 21,
          maxTemperatureC: 28,
          maxPrecipitationProbability: 5,
          totalPrecipitationMm: 0,
          maxWindGustMps: 6,
          dominantConditionCode: 'clearsky_day',
          hasThunderRisk: false,
        }),
      ),
    },
  };
}

describe('WeekendWeatherHours', () => {
  it('says a session that has already run is not waiting on the model', () => {
    // Mid-afternoon on Friday: the provider starts at the current hour, so
    // Practice 1 has dropped out of the forecast behind us.
    const now = Date.UTC(2026, 8, 4, 13, 22);
    const html = renderToStaticMarkup(
      <WeekendWeatherHours
        race={race}
        weather={weatherWith(
          [...hoursForDay(0, 15), ...hoursForDay(1), ...hoursForDay(2)],
          now,
        )}
        now={now}
      />,
    );

    expect(html).toContain('Already run');
    expect(html).toContain('Practice 1 has run.');
    expect(html).not.toContain('Check back closer to the weekend');
  });

  it('keeps the model-range wording for a session still ahead', () => {
    // A week out: the model runs out during Sunday, so the race itself has no
    // hours yet and checking back is the useful thing to say.
    const now = Date.UTC(2026, 7, 30, 9);
    const html = renderToStaticMarkup(
      <WeekendWeatherHours
        race={race}
        weather={weatherWith(
          [...hoursForDay(0), ...hoursForDay(1), ...hoursForDay(2, 6, 12)],
          now,
        )}
        now={now}
      />,
    );

    expect(html).toContain('Not yet forecast');
    expect(html).toContain('Check back closer to the weekend');
    expect(html).not.toContain('has run.');
  });

  it('leaves the hours to the modal, keeping the card to its trigger', () => {
    const now = Date.UTC(2026, 8, 4, 13, 22);
    const html = renderToStaticMarkup(
      <RaceWriteupWeekendSchedule
        race={race}
        timeZone="Europe/Rome"
        timeZoneLabel="MONZA TIME"
        weather={weatherWith(
          [...hoursForDay(0, 15), ...hoursForDay(1), ...hoursForDay(2)],
          now,
        )}
        now={now}
      />,
    );

    expect(html).toContain('Hour-by-hour forecast');
    expect(html).not.toContain('Already run');
  });

  it('stacks the forecast under the start time so the session name can centre against both', () => {
    const now = Date.UTC(2026, 8, 4, 13, 22);
    const html = renderToStaticMarkup(
      <RaceWriteupWeekendSchedule
        race={race}
        timeZone="Europe/Rome"
        timeZoneLabel="MONZA TIME"
        weather={weatherWith(
          [...hoursForDay(0, 15), ...hoursForDay(1), ...hoursForDay(2)],
          now,
        )}
        now={now}
      />,
    );

    expect(html).toContain('row-span-2 sm:row-span-1');
    expect(html).toContain('col-start-2');
    expect(html).not.toContain('col-span-2');
  });
});

it('keeps the modal and hero time controls in sync in both directions', async () => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const now = Date.UTC(2026, 8, 3);
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const trackZone = deviceZone === 'Asia/Tokyo' ? 'Europe/Rome' : 'Asia/Tokyo';
  function button(scope: ParentNode, label: string) {
    return [...scope.querySelectorAll('button')].find(
      (item) => item.textContent === label,
    )!;
  }
  try {
    await act(async () =>
      root.render(
        <RaceWriteupWeekendSchedule
          race={race}
          timeZone={trackZone}
          timeZoneLabel="Track time"
          weather={weatherWith(hoursForDay(0), now)}
          now={now}
        />,
      ),
    );
    await act(async () => button(container, 'My time').click());
    await act(async () => button(container, 'Hour-by-hour forecast').click());
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(button(dialog, 'My time').getAttribute('aria-pressed')).toBe('true');
    const viewerHours = dialog.querySelector('time')!.textContent;
    await act(async () => button(dialog, 'Track time').click());
    expect(button(container, 'Track time').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(dialog.querySelector('time')!.textContent).not.toBe(viewerHours);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('moves forecast periods to the viewer’s calendar date and preserves fractional offsets', () => {
  const now = Date.UTC(2026, 8, 3);
  const html = renderToStaticMarkup(
    <WeekendWeatherHours
      race={race}
      weather={weatherWith(hoursForDay(0, 6, 8), now)}
      now={now}
      timeZone="Pacific/Honolulu"
    />,
  );
  expect(html).toContain('Thursday 3 Sept');
  expect(html).toContain('18:00–21:00');
  const india = renderToStaticMarkup(
    <WeekendWeatherHours
      race={race}
      weather={weatherWith(hoursForDay(0, 6, 8), now)}
      now={now}
      timeZone="Asia/Kolkata"
    />,
  );
  expect(india).toContain('09:30–12:30');
});
