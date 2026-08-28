import type { Meta, StoryObj } from '@storybook/react-vite';

import type { RaceWeather, WeatherHour } from '@/lib/weatherPresentation';

import { WeekendWeatherForecast } from './WeekendWeatherForecast';

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const now = Date.UTC(2026, 8, 4, 8);
const fp1StartAt = Date.UTC(2026, 8, 4, 11, 30);
const fp2StartAt = Date.UTC(2026, 8, 4, 15);
const fp3StartAt = Date.UTC(2026, 8, 5, 10, 30);
const qualiStartAt = Date.UTC(2026, 8, 5, 14);
const raceStartAt = Date.UTC(2026, 8, 6, 13);

function hoursForDay(
  dayOffset: number,
  rainFromLocalHour?: number,
  thunderFromLocalHour?: number,
): WeatherHour[] {
  return Array.from({ length: 18 }, (_, index) => {
    const localHour = 6 + index;
    const raining = rainFromLocalHour != null && localHour >= rainFromLocalHour;
    const thunder =
      thunderFromLocalHour != null && localHour >= thunderFromLocalHour;
    return {
      at: Date.UTC(2026, 8, 4 + dayOffset, 4 + index),
      localDate: `2026-09-0${4 + dayOffset}`,
      localHour,
      forecastPeriodHours: 1,
      temperatureC: 17 + Math.sin((index / 17) * Math.PI) * 7,
      conditionCode: thunder
        ? 'heavyrainandthunder_day'
        : raining
          ? 'rain_day'
          : index < 5
            ? 'partlycloudy_day'
            : 'clearsky_day',
      precipitationAmountMm: thunder ? 2.4 : raining ? 0.6 : 0,
      precipitationProbability: thunder ? 75 : raining ? 55 : 10,
      thunderProbability: thunder ? 45 : 0,
      windSpeedMps: 3.5,
      windGustMps: thunder ? 13 : 7,
    };
  });
}

const hours = [
  ...hoursForDay(0),
  ...hoursForDay(1, 13),
  ...hoursForDay(2, 18, 20),
];

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
    timeZone: 'Europe/Rome',
    provider: 'met_no',
    providerUpdatedAt: now - HOUR,
    fetchedAt: now - HOUR,
    checkedAt: now - HOUR,
    expiresAt: now + HOUR,
    eventDates: ['2026-09-04', '2026-09-05', '2026-09-06'],
    hours,
    days: [
      {
        localDate: '2026-09-04',
        minTemperatureC: 17,
        maxTemperatureC: 24,
        maxPrecipitationProbability: 10,
        totalPrecipitationMm: 0,
        maxWindGustMps: 7,
        dominantConditionCode: 'clearsky_day',
        hasThunderRisk: false,
      },
      {
        localDate: '2026-09-05',
        minTemperatureC: 17,
        maxTemperatureC: 24,
        maxPrecipitationProbability: 55,
        totalPrecipitationMm: 6.6,
        maxWindGustMps: 7,
        dominantConditionCode: 'rain_day',
        hasThunderRisk: false,
      },
      {
        localDate: '2026-09-06',
        minTemperatureC: 17,
        maxTemperatureC: 24,
        maxPrecipitationProbability: 75,
        totalPrecipitationMm: 12,
        maxWindGustMps: 13,
        dominantConditionCode: 'clearsky_day',
        hasThunderRisk: true,
      },
    ],
  },
};

const meta = {
  title: 'Components/Weather/WeekendWeatherForecast',
  component: WeekendWeatherForecast,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <main className="min-h-screen bg-page">
        <div className="mx-auto max-w-5xl px-3 sm:px-4">
          <Story />
        </div>
      </main>
    ),
  ],
  args: {
    now,
    race: {
      slug: 'italy-2026',
      name: 'Italian Grand Prix',
      fp1StartAt,
      fp2StartAt,
      fp3StartAt,
      qualiStartAt,
      raceStartAt,
    },
    weather,
  },
} satisfies Meta<typeof WeekendWeatherForecast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RaceDayStormLater: Story = {};

export const StaleForecast: Story = {
  args: {
    weather: { ...weather, isStale: true },
    now: now + DAY,
  },
};
