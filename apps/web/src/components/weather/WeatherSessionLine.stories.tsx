import type { Meta, StoryObj } from '@storybook/react-vite';

import type { RaceWeather, WeatherHour } from '@/lib/weatherPresentation';

import { WeatherSessionLine } from './WeatherSessionLine';

const HOUR = 60 * 60_000;
const now = Date.now();
const qualiStartAt = now + 24 * HOUR;
const raceStartAt = qualiStartAt + 24 * HOUR;

const hours: WeatherHour[] = Array.from({ length: 48 }, (_, index) => {
  const at = qualiStartAt - 6 * HOUR + index * HOUR;
  const wet = at >= raceStartAt - HOUR;
  return {
    at,
    localDate: new Date(at).toISOString().slice(0, 10),
    localHour: new Date(at).getUTCHours(),
    forecastPeriodHours: 1,
    temperatureC: wet ? 21 : 26,
    conditionCode: wet ? 'rainandthunder' : 'partlycloudy_day',
    precipitationAmountMm: wet ? 1.2 : 0,
    precipitationProbability: wet ? 70 : 10,
    thunderProbability: wet ? 35 : 0,
    windSpeedMps: 4,
    windGustMps: wet ? 12 : 7,
  };
});

const weather: RaceWeather = {
  isStale: false,
  attribution: {
    name: 'MET Norway',
    url: 'https://www.met.no/en',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  forecast: {
    raceSlug: 'italy-2026',
    timeZone: 'UTC',
    provider: 'met_no',
    providerUpdatedAt: now - HOUR,
    fetchedAt: now - HOUR,
    checkedAt: now - HOUR,
    expiresAt: now + HOUR,
    eventDates: [...new Set(hours.map((hour) => hour.localDate))],
    hours,
    days: [],
  },
};

const meta = {
  title: 'Components/Weather/WeatherSessionLine',
  component: WeatherSessionLine,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <main className="mx-auto max-w-3xl bg-page p-4">
        <div className="rounded-sm border border-border bg-surface">
          <p className="px-4 py-3 text-sm text-text-muted sm:px-5">
            Picks card above
          </p>
          <Story />
        </div>
      </main>
    ),
  ],
  args: {
    now,
    weather,
    race: { slug: 'italy-2026', qualiStartAt, raceStartAt },
  },
} satisfies Meta<typeof WeatherSessionLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Qualifying: Story = {
  args: { sessionKey: 'quali' },
};

export const WetRace: Story = {
  args: { sessionKey: 'race' },
};

/** A session that has already run has no forecast left, so the row falls back
 *  to the next one still ahead rather than emptying. */
export const PastSessionFallsBack: Story = {
  args: { sessionKey: 'fp1' },
};
