import type { Meta, StoryObj } from '@storybook/react';

import { PracticeHighlights } from './PracticeHighlights';
import type { PracticeResults } from '@/lib/practiceSessions';
import type { RaceWeather, WeatherHour } from '@/lib/weatherPresentation';

const fp1StartAt = Date.UTC(2026, 8, 4, 11, 30);
const fp2StartAt = Date.UTC(2026, 8, 4, 15);
const fp3StartAt = Date.UTC(2026, 8, 5, 10, 30);
const raceStartAt = Date.UTC(2026, 8, 6, 13);

function hour(at: number, temperatureC: number): WeatherHour {
  return {
    at,
    localDate: new Date(at).toISOString().slice(0, 10),
    localHour: new Date(at).getUTCHours(),
    forecastPeriodHours: 1,
    temperatureC,
    conditionCode: 'clearsky_day',
    precipitationAmountMm: 0,
    precipitationProbability: 5,
    thunderProbability: 0,
    windSpeedMps: 3,
    windGustMps: 6,
  };
}

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
    providerUpdatedAt: fp1StartAt,
    fetchedAt: fp1StartAt,
    checkedAt: fp1StartAt,
    expiresAt: raceStartAt,
    eventDates: ['2026-09-04', '2026-09-05'],
    hours: [hour(fp1StartAt, 24), hour(fp2StartAt, 26), hour(fp3StartAt, 22)],
    days: [],
  },
};

const race = {
  raceStartAt,
  fp1StartAt,
  fp2StartAt,
  fp3StartAt,
};

type Entry = PracticeResults[number]['entries'][number];

function entries(
  rows: [
    code: string,
    name: string,
    team: string,
    number: number,
    lap: number,
  ][],
): Entry[] {
  return rows.map(
    ([code, displayName, team, driverNumber, bestLapSeconds], index) => ({
      driverNumber,
      code,
      displayName,
      team,
      position: index + 1,
      bestLapSeconds,
      gapToLeaderSeconds: Number((bestLapSeconds - rows[0][4]).toFixed(3)),
      lapCount: 26 + index,
      isReserve: false,
    }),
  );
}

/** Monza 2026, the top six of each session as published. */
const MONZA: PracticeResults = [
  {
    sessionType: 'fp1',
    publishedAt: Date.parse('2026-09-04T11:51:35Z'),
    entries: entries([
      ['LEC', 'Charles LECLERC', 'Ferrari', 16, 83.008],
      ['HAM', 'Lewis HAMILTON', 'Ferrari', 44, 83.181],
      ['RUS', 'George RUSSELL', 'Mercedes', 63, 83.312],
      ['LAW', 'Liam LAWSON', 'Red Bull Racing', 30, 83.433],
      ['ANT', 'Kimi ANTONELLI', 'Mercedes', 12, 83.644],
      ['NOR', 'Lando NORRIS', 'McLaren', 1, 83.719],
    ]),
  },
  {
    sessionType: 'fp2',
    publishedAt: Date.parse('2026-09-04T15:26:35Z'),
    entries: entries([
      ['RUS', 'George RUSSELL', 'Mercedes', 63, 82.559],
      ['LEC', 'Charles LECLERC', 'Ferrari', 16, 82.679],
      ['ANT', 'Kimi ANTONELLI', 'Mercedes', 12, 82.7],
      ['NOR', 'Lando NORRIS', 'McLaren', 1, 82.943],
      ['HAM', 'Lewis HAMILTON', 'Ferrari', 44, 83.016],
      ['PIA', 'Oscar PIASTRI', 'McLaren', 81, 83.028],
    ]),
  },
];

const meta = {
  title: 'Components/PracticeHighlights',
  component: PracticeHighlights,
  parameters: { layout: 'padded' },
  // The dashboard's centre column, which is the only width this block renders at.
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
  args: {
    results: MONZA,
    raceName: 'Italian Grand Prix',
    raceSlug: 'italy-2026',
    race,
    weather,
  },
} satisfies Meta<typeof PracticeHighlights>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Friday evening: both sessions in, side by side. */
export const FridayEvening: Story = {};

/** Friday lunchtime: FP1 alone takes the full width. */
export const FirstSessionOnly: Story = {
  args: { results: [MONZA[0]] },
};

/** Saturday morning, once FP3 lands and three sessions share the row. */
export const AllThreeSessions: Story = {
  args: {
    results: [
      ...MONZA,
      { ...MONZA[1], sessionType: 'fp3', publishedAt: Date.now() },
    ],
  },
};
