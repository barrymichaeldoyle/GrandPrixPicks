import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import type { Meta, StoryObj } from '@storybook/react';
import { ArrowLeft, Trophy } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useState } from 'react';

import { Button } from '../../../../../components/Button/Button';
import { PredictionForm } from '../../../../../components/PredictionForm';
import { RandomizeButton } from '../../../../../components/RandomizeButton';
import type {
  DriverRef,
  WeekendCardData,
} from '../../../../../components/RaceScoreCard/types';
import type { TabSwitchOption } from '../../../../../components/TabSwitch';
import {
  getRaceSessionLockAt,
  getRaceSessionStartAt,
} from '../../../../../lib/raceSessions';
import type { SessionType } from '../../../../../lib/sessions';
import {
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '../../../../../lib/sessions';
import { raceEventStoryScenarios } from '../../../../../stories/scenarios/raceEventScenarios';
import {
  StorybookMockProviders,
  buildStorybookConvexMocks,
} from '../../../../../storybook/mockAppRuntime';
import { StorybookRouter } from '../../../../../stories/router-decorator';

import { RaceEventPage } from './RaceEventPage';

const meta = {
  title: 'Routes/Races/$raceSlug/RaceEventPage',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;
type RaceArgs = { raceId: Id<'races'> };
type RaceSessionArgs = RaceArgs & { sessionType: SessionType };

function StorybookPredictionForm(props: ComponentProps<typeof PredictionForm>) {
  return <PredictionForm {...props} enableNavigationBlocker={false} />;
}

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function fakeRaceId(value: string) {
  return value as Id<'races'>;
}

function fakeDriverId(value: string) {
  return value as Id<'drivers'>;
}

function fakeMatchupId(value: string) {
  return value as Id<'h2hMatchups'>;
}

function makeRace({
  slug,
  name,
  status,
  hasSprint,
  raceStartAt,
}: {
  slug: string;
  name: string;
  status: 'upcoming' | 'locked' | 'finished';
  hasSprint: boolean;
  raceStartAt: number;
}) {
  return {
    _id: fakeRaceId(`${slug}-id`),
    _creationTime: now - 5 * DAY,
    season: 2026,
    round: 7,
    name,
    slug,
    timeZone: 'America/New_York',
    status,
    hasSprint,
    sprintQualiStartAt: hasSprint ? raceStartAt - 2 * DAY : undefined,
    sprintQualiLockAt: hasSprint ? raceStartAt - 2 * DAY : undefined,
    sprintStartAt: hasSprint ? raceStartAt - DAY : undefined,
    sprintLockAt: hasSprint ? raceStartAt - DAY : undefined,
    qualiStartAt: raceStartAt - 12 * HOUR,
    qualiLockAt: raceStartAt - 12 * HOUR,
    raceStartAt,
    predictionLockAt: raceStartAt,
    createdAt: now - 30 * DAY,
    updatedAt: now,
  };
}

function makeDrivers(): DriverRef[] {
  return [
    {
      driverId: fakeDriverId('nor'),
      code: 'NOR',
      displayName: 'Lando Norris',
      team: 'McLaren',
      number: 4,
      nationality: 'GB',
    },
    {
      driverId: fakeDriverId('pia'),
      code: 'PIA',
      displayName: 'Oscar Piastri',
      team: 'McLaren',
      number: 81,
      nationality: 'AU',
    },
    {
      driverId: fakeDriverId('lec'),
      code: 'LEC',
      displayName: 'Charles Leclerc',
      team: 'Ferrari',
      number: 16,
      nationality: 'MC',
    },
    {
      driverId: fakeDriverId('ver'),
      code: 'VER',
      displayName: 'Max Verstappen',
      team: 'Red Bull Racing',
      number: 1,
      nationality: 'NL',
    },
    {
      driverId: fakeDriverId('ham'),
      code: 'HAM',
      displayName: 'Lewis Hamilton',
      team: 'Ferrari',
      number: 44,
      nationality: 'GB',
    },
  ];
}

function makeDriverDocs(): Doc<'drivers'>[] {
  return makeDrivers().map((driver, index) => ({
    _id: driver.driverId,
    _creationTime: now - (index + 1) * HOUR,
    code: driver.code,
    displayName: driver.displayName ?? driver.code,
    team: driver.team ?? undefined,
    number: driver.number ?? undefined,
    nationality: driver.nationality ?? undefined,
    createdAt: now - 30 * DAY,
    updatedAt: now,
  }));
}

function makeMatchups(drivers: Doc<'drivers'>[]) {
  return [
    {
      _id: fakeMatchupId('mclaren'),
      team: 'McLaren',
      driver1: drivers[0],
      driver2: drivers[1],
    },
    {
      _id: fakeMatchupId('ferrari'),
      team: 'Ferrari',
      driver1: drivers[2],
      driver2: drivers[4],
    },
  ];
}

function makeWeekendCardData(
  race: ReturnType<typeof makeRace>,
  opts: {
    hasPredictions: boolean;
    scoredSessions: SessionType[];
  },
): WeekendCardData {
  const drivers = makeDrivers();
  function makeSession(session: SessionType) {
    if (
      !race.hasSprint &&
      (session === 'sprint_quali' || session === 'sprint')
    ) {
      return null;
    }
    const hasResults = opts.scoredSessions.includes(session);
    return {
      picks: opts.hasPredictions ? drivers : [],
      points: hasResults ? 14 : null,
      breakdown: hasResults
        ? drivers.map((d, idx) => ({
            driverId: d.driverId,
            predictedPosition: idx + 1,
            actualPosition: idx + 1,
            points: idx < 2 ? 5 : 1,
          }))
        : null,
      actualTop5: hasResults ? drivers : null,
      fullClassification: hasResults
        ? drivers.map((d, idx) => ({
            position: idx + 1,
            driverId: d.driverId,
            code: d.code,
            displayName: d.displayName ?? d.code,
            team: d.team ?? null,
            number: d.number ?? null,
            nationality: d.nationality ?? null,
          }))
        : null,
      isHidden: false,
      isLocked: race.predictionLockAt <= now,
      hasResults,
    };
  }

  const sessions: WeekendCardData['sessions'] = {
    sprint_quali: makeSession('sprint_quali'),
    sprint: makeSession('sprint'),
    quali: makeSession('quali'),
    race: makeSession('race'),
  };
  const scoredSessionCount = Object.values(sessions).filter(
    (s) => s?.points != null,
  ).length;
  const totalPoints = Object.values(sessions).reduce(
    (sum, s) => sum + (s?.points ?? 0),
    0,
  );

  return {
    raceId: race._id,
    raceSlug: race.slug,
    raceName: race.name,
    raceRound: race.round,
    raceStatus: race.status,
    raceDate: race.raceStartAt,
    hasSprint: race.hasSprint,
    sessions,
    totalPoints,
    maxPoints: scoredSessionCount * 25,
    scoredSessionCount,
    raceRank: { position: 12, totalPlayers: 483 },
    predictionOpenAt: race.raceStartAt - 7 * DAY,
  };
}

function buildTop5PredictionsBySession(
  weekendSessions: readonly SessionType[],
  hasPredictions: boolean,
  drivers: Doc<'drivers'>[],
) {
  const picks = drivers.slice(0, 5).map((driver) => driver._id);
  return {
    sprint_quali:
      hasPredictions && weekendSessions.includes('sprint_quali') ? picks : null,
    sprint: hasPredictions && weekendSessions.includes('sprint') ? picks : null,
    quali: hasPredictions && weekendSessions.includes('quali') ? picks : null,
    race: hasPredictions && weekendSessions.includes('race') ? picks : null,
  };
}

function buildH2HPredictionsBySession(
  weekendSessions: readonly SessionType[],
  hasPredictions: boolean,
  matchups: ReturnType<typeof makeMatchups>,
) {
  const picks = Object.fromEntries(
    matchups.map((matchup) => [matchup._id, matchup.driver1._id]),
  );

  return {
    sprint_quali:
      hasPredictions && weekendSessions.includes('sprint_quali') ? picks : null,
    sprint: hasPredictions && weekendSessions.includes('sprint') ? picks : null,
    quali: hasPredictions && weekendSessions.includes('quali') ? picks : null,
    race: hasPredictions && weekendSessions.includes('race') ? picks : null,
  };
}

function buildTop5Scores(cardData: WeekendCardData) {
  return Object.fromEntries(
    Object.entries(cardData.sessions).map(([session, sessionData]) => [
      session,
      sessionData?.points != null
        ? {
            points: sessionData.points,
            enrichedBreakdown: sessionData.breakdown ?? [],
          }
        : null,
    ]),
  );
}

function buildH2HResultsBySession(
  weekendSessions: readonly SessionType[],
  matchups: ReturnType<typeof makeMatchups>,
) {
  return Object.fromEntries(
    weekendSessions.map((session, index) => [
      session,
      matchups.map((matchup, matchupIndex) => ({
        matchupId: matchup._id,
        team: matchup.team,
        winnerId:
          (index + matchupIndex) % 2 === 0
            ? matchup.driver1._id
            : matchup.driver2._id,
        driver1: matchup.driver1,
        driver2: matchup.driver2,
      })),
    ]),
  ) as Partial<
    Record<
      SessionType,
      Array<{
        matchupId: Id<'h2hMatchups'>;
        team: string;
        winnerId: Id<'drivers'>;
        driver1: Doc<'drivers'>;
        driver2: Doc<'drivers'>;
      }>
    >
  >;
}

function Scenario({
  race,
  isNextRace,
  isAuthLoaded,
  isSignedIn,
  hasPredictions,
  hasPublishedResults,
  allEventsScored,
  scoredSessions,
}: {
  race: ReturnType<typeof makeRace>;
  isNextRace: boolean;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  hasPredictions: boolean;
  hasPublishedResults: boolean;
  allEventsScored: boolean;
  scoredSessions: SessionType[];
}) {
  const weekendSessions: readonly SessionType[] = race.hasSprint
    ? ['sprint_quali', 'sprint', 'quali', 'race']
    : ['quali', 'race'];
  const [selectedSession, setSelectedSession] = useState<SessionType>(
    weekendSessions[weekendSessions.length - 1],
  );
  const [top5EditingSession, setTop5EditingSession] =
    useState<SessionType | null>(null);
  const [h2hEditingSession, setH2hEditingSession] =
    useState<SessionType | null>(null);
  const [top5HasUnsavedChanges, setTop5HasUnsavedChanges] = useState(false);
  const [h2hHasUnsavedChanges, setH2hHasUnsavedChanges] = useState(false);
  const drivers = makeDriverDocs();
  const matchups = makeMatchups(drivers);
  const cardData = makeWeekendCardData(race, {
    hasPredictions,
    scoredSessions,
  });
  const top5PredictionsBySession = buildTop5PredictionsBySession(
    weekendSessions,
    hasPredictions,
    drivers,
  );
  const h2hPredictionsBySession = buildH2HPredictionsBySession(
    weekendSessions,
    hasPredictions,
    matchups,
  );
  const top5Scores = buildTop5Scores(cardData);
  const h2hResultsBySession = buildH2HResultsBySession(
    weekendSessions,
    matchups,
  );
  const nextRace = isNextRace
    ? race
    : makeRace({
        slug: 'next-race',
        name: 'Spanish Grand Prix',
        status: 'upcoming',
        hasSprint: false,
        raceStartAt: race.raceStartAt + 14 * DAY,
      });
  const convexMocks = buildStorybookConvexMocks({
    queries: [
      [api.drivers.listDrivers, drivers],
      [
        api.races.getRace,
        ({ raceId }: RaceArgs) => (raceId === race._id ? race : null),
      ],
      [api.races.getNextRace, nextRace],
      [api.h2h.getMatchupsForSeason, matchups],
      [
        api.h2h.myH2HPredictionsForRace,
        ({ raceId }: RaceArgs) =>
          raceId === race._id ? h2hPredictionsBySession : null,
      ],
      [
        api.results.getAllResultsForRace,
        ({ raceId }: RaceArgs) => (raceId === race._id ? scoredSessions : []),
      ],
      [
        api.results.getResultForRace,
        ({ raceId, sessionType }: RaceSessionArgs) =>
          raceId === race._id &&
          cardData.sessions[sessionType]?.fullClassification != null
            ? {
                enrichedClassification:
                  cardData.sessions[sessionType]?.fullClassification ?? [],
              }
            : null,
      ],
      [
        api.predictions.myWeekendPredictions,
        ({ raceId }: RaceArgs) =>
          raceId === race._id
            ? { predictions: top5PredictionsBySession }
            : null,
      ],
      [
        api.results.getMyScoresForRace,
        ({ raceId }: RaceArgs) => (raceId === race._id ? top5Scores : null),
      ],
      [
        api.h2h.getH2HResultsForRace,
        ({ raceId, sessionType }: RaceSessionArgs) =>
          raceId === race._id && scoredSessions.includes(sessionType)
            ? (h2hResultsBySession[sessionType] ?? [])
            : [],
      ],
      [
        api.h2h.getMyH2HScoreForRace,
        ({ raceId, sessionType }: RaceSessionArgs) => {
          if (raceId !== race._id || !scoredSessions.includes(sessionType)) {
            return null;
          }
          const results = h2hResultsBySession[sessionType] ?? [];
          const picks = h2hPredictionsBySession[sessionType] ?? {};
          const correctPicks = results.filter(
            (result) => picks[result.matchupId] === result.winnerId,
          ).length;
          return {
            points: correctPicks,
            correctPicks,
            totalPicks: results.length,
          };
        },
      ],
    ],
    mutations: [
      [api.predictions.submitPrediction, async () => null],
      [api.predictions.randomizePredictions, async () => null],
      [api.h2h.submitH2HPredictions, async () => null],
    ],
  });

  const pointsSoFar = Object.entries(cardData.sessions).reduce(
    (sum, [, session]) => {
      return sum + (session?.points ?? 0);
    },
    0,
  );
  const scoredEventCount = weekendSessions.filter((session) =>
    scoredSessions.includes(session),
  ).length;

  function getSessionLockAt(session: SessionType) {
    return getRaceSessionLockAt(race, session);
  }

  function getSessionStartAt(session: SessionType) {
    return getRaceSessionStartAt(race, session);
  }

  const sessionTabOptions: TabSwitchOption<SessionType>[] = weekendSessions.map(
    (session) => ({
      value: session,
      label: (
        <>
          <span className="hidden sm:inline">{SESSION_LABELS[session]}</span>
          <span className="sm:hidden">{SESSION_LABELS_SHORT[session]}</span>
        </>
      ),
    }),
  );

  return (
    <StorybookMockProviders
      auth={{ isLoaded: isAuthLoaded, isSignedIn }}
      convex={convexMocks}
    >
      <StorybookRouter>
        <RaceEventPage
          race={race}
          isNextRace={isNextRace}
          isAuthLoaded={isAuthLoaded}
          isSignedIn={isSignedIn}
          isPredictionsLoading={false}
          isViewerPredictionDataLoading={false}
          hasPredictions={hasPredictions}
          hasH2HPredictions={hasPredictions}
          hasPublishedResults={hasPublishedResults}
          allEventsScored={allEventsScored}
          pointsSoFar={pointsSoFar}
          scoredEventCount={scoredEventCount}
          weekendSessions={weekendSessions}
          selectedSession={selectedSession}
          onSelectedSessionChange={setSelectedSession}
          sessionTabOptions={sessionTabOptions}
          trackTimeZone={race.timeZone}
          getSessionStartAt={getSessionStartAt}
          getSessionLockAt={getSessionLockAt}
          isSessionPublished={(session) => scoredSessions.includes(session)}
          cardData={cardData}
          top5EditingSession={top5EditingSession}
          onTop5EditingSessionChange={setTop5EditingSession}
          top5HasUnsavedChanges={top5HasUnsavedChanges}
          onTop5DirtyChange={setTop5HasUnsavedChanges}
          h2hEditingSession={h2hEditingSession}
          onH2HEditingSessionChange={setH2hEditingSession}
          h2hHasUnsavedChanges={h2hHasUnsavedChanges}
          onH2HDirtyChange={setH2hHasUnsavedChanges}
          existingTop5PicksBySession={top5PredictionsBySession}
          randomizeControl={
            <RandomizeButton
              raceId={race._id}
              hasPredictions={hasPredictions}
              hasH2HPredictions={hasPredictions}
            />
          }
          backLink={
            <Button asChild size="sm" leftIcon={ArrowLeft} className="mb-4">
              <a href="/races">Back to races</a>
            </Button>
          }
          leaderboardLink={
            <Button asChild variant="text" size="sm" leftIcon={Trophy}>
              <a href="/leaderboard">Leaderboard</a>
            </Button>
          }
          PredictionFormComponent={StorybookPredictionForm}
        />
      </StorybookRouter>
    </StorybookMockProviders>
  );
}

function renderCatalogScenario(
  scenario: (typeof raceEventStoryScenarios)[keyof typeof raceEventStoryScenarios],
) {
  return (
    <Scenario
      race={makeRace({
        slug: scenario.race.slug,
        name: scenario.race.name,
        status: scenario.race.status,
        hasSprint: scenario.race.hasSprint,
        raceStartAt: now + scenario.race.raceStartAtOffsetMs,
      })}
      isNextRace={scenario.isNextRace}
      isAuthLoaded={scenario.isAuthLoaded}
      isSignedIn={scenario.isSignedIn}
      hasPredictions={scenario.hasPredictions}
      hasPublishedResults={scenario.hasPublishedResults}
      allEventsScored={scenario.allEventsScored}
      scoredSessions={scenario.scoredSessions}
    />
  );
}

export const UpcomingNoPicks: Story = {
  render: () =>
    renderCatalogScenario(
      raceEventStoryScenarios.race_upcoming_signed_in_no_picks,
    ),
};

export const UpcomingWithPredictions: Story = {
  render: () =>
    renderCatalogScenario(
      raceEventStoryScenarios.race_upcoming_signed_in_complete,
    ),
};

export const LockedNoPredictions: Story = {
  render: () =>
    renderCatalogScenario(
      raceEventStoryScenarios.race_locked_signed_in_no_picks,
    ),
};

export const LockedWithPredictions: Story = {
  render: () =>
    renderCatalogScenario(
      raceEventStoryScenarios.race_locked_signed_in_complete_no_results,
    ),
};

export const PartialResults: Story = {
  render: () =>
    renderCatalogScenario(
      raceEventStoryScenarios.race_partial_results_standard,
    ),
};

export const FinishedScored: Story = {
  render: () =>
    renderCatalogScenario(
      raceEventStoryScenarios.race_finished_scored_standard,
    ),
};
