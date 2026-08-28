import type { Meta, StoryObj } from '@storybook/react-vite';

import type { RaceWeather, WeatherHour } from '@/lib/weatherPresentation';

import { WeatherFeedCard } from './WeatherFeedCard';

const HOUR = 60 * 60_000;
const now = Date.now();
const fp1StartAt = now + 24 * HOUR;

const hours: WeatherHour[] = Array.from({ length: 16 }, (_, index) => {
  const at = fp1StartAt - 6 * HOUR + index * HOUR;
  const laterStorm = index >= 9;
  return {
    at,
    localDate: new Date(at).toISOString().slice(0, 10),
    localHour: new Date(at).getUTCHours(),
    forecastPeriodHours: 1,
    temperatureC: 19 + Math.min(index, 6),
    conditionCode: laterStorm ? 'rainandthunder' : 'partlycloudy_day',
    precipitationAmountMm: laterStorm ? 1.2 : 0,
    precipitationProbability: laterStorm ? 70 : 15,
    thunderProbability: laterStorm ? 35 : 0,
    windSpeedMps: 4,
    windGustMps: laterStorm ? 12 : 7,
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
  title: 'Components/Weather/WeatherFeedCard',
  component: WeatherFeedCard,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <main className="mx-auto max-w-3xl bg-page p-4">
        <Story />
      </main>
    ),
  ],
  args: {
    now,
    weather,
    race: {
      slug: 'italy-2026',
      name: 'Italian Grand Prix',
      fp1StartAt,
      raceStartAt: fp1StartAt + 2 * 24 * HOUR,
    },
  },
} satisfies Meta<typeof WeatherFeedCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StormAfterPractice: Story = {};
