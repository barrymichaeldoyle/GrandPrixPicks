import type { Meta, StoryObj } from '@storybook/react-vite';

import type { RaceWeather, WeatherHour } from '@/lib/weatherPresentation';

import { LandingHero, ScrollToPicksCta } from './LandingHero';

const HOUR = 60 * 60_000;

/** The 2026 Las Vegas weekend as seeded, in UTC. */
const race = {
  name: 'Las Vegas Grand Prix',
  slug: 'las-vegas-2026',
  round: 21,
  fp1StartAt: Date.UTC(2026, 10, 20, 0, 30),
  fp2StartAt: Date.UTC(2026, 10, 20, 4, 0),
  fp3StartAt: Date.UTC(2026, 10, 21, 0, 30),
  qualiStartAt: Date.UTC(2026, 10, 21, 4, 0),
  raceStartAt: Date.UTC(2026, 10, 22, 4, 0),
};

/** Tuesday morning of race week, as the page would be read. */
const now = Date.UTC(2026, 10, 17, 7, 20);

const hours: WeatherHour[] = Array.from({ length: 90 }, (_, index) => {
  const at = race.fp1StartAt - 6 * HOUR + index * HOUR;
  const wet = at < race.fp3StartAt - 6 * HOUR;
  return {
    at,
    localDate: new Date(at - 8 * HOUR).toISOString().slice(0, 10),
    localHour: new Date(at - 8 * HOUR).getUTCHours(),
    forecastPeriodHours: 1,
    temperatureC: wet ? 9 : 12,
    conditionCode: wet ? 'rain' : 'clearsky_night',
    precipitationAmountMm: wet ? 1.1 : 0,
    precipitationProbability: wet ? 80 : 5,
    windSpeedMps: 3,
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
    raceSlug: race.slug,
    timeZone: 'America/Los_Angeles',
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

/** This week's prod headlines for Las Vegas. */
const news = {
  total: 7,
  items: [
    {
      key: 'norris-vegas-wet-intermediates-cold',
      headline: "Drivers worry about Pirelli's intermediates in cold Las Vegas",
      sourceName: 'Autosport',
      driverCodes: ['NOR'],
      team: 'McLaren',
    },
    {
      key: 'haas-hirakawa-bearman-fp1-vegas',
      headline: "Hirakawa drives Bearman's Haas in Las Vegas FP1",
      sourceName: 'RaceFans',
      driverCodes: ['BEA'],
      team: 'Haas',
    },
    {
      key: 'wolff-russell-second-place-priority',
      headline: 'Mercedes may back Russell in the fight for second',
      sourceName: 'Sky Sports',
      driverCodes: ['RUS', 'ANT'],
      team: 'Mercedes',
    },
    {
      key: 'williams-sainz-albon-2027-test-programme',
      headline: 'Williams is using practice to test for 2027',
      sourceName: 'The Race',
      driverCodes: ['SAI', 'ALB'],
      team: 'Williams',
    },
    {
      key: 'pirelli-las-vegas-softest-compounds',
      headline: 'Pirelli brings its softest three compounds to Las Vegas',
      sourceName: 'Pirelli',
      driverCodes: [],
      team: null,
    },
  ],
};

const meta = {
  title: 'Landing/LandingHero',
  component: LandingHero,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-page">
        <Story />
      </div>
    ),
  ],
  args: {
    race,
    lockSession: { label: 'Qualifying', startAt: race.qualiStartAt },
    now,
    weather,
    news,
    cta: <ScrollToPicksCta targetId="landing-picks" />,
  },
} satisfies Meta<typeof LandingHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RaceWeek: Story = {};

/** Outside the forecast window: the schedule stands alone. */
export const NoForecast: Story = {
  args: { weather: null },
};

/** A weekend nobody has written about yet. */
export const NoNews: Story = {
  args: { news: null },
};

/** Between seasons: no race, so no deadline, schedule or news. */
export const OffSeason: Story = {
  args: { race: null, lockSession: null, weather: null, news: null },
};
