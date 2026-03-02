import type { Meta, StoryObj } from '@storybook/react';
import { ArrowLeft, Dices, Swords, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '../components/Button';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RaceEventPageLayout } from '../components/RaceEventPageLayout';
import { RaceScoreCard } from '../components/RaceScoreCard';
import type {
  DriverRef,
  WeekendCardData,
} from '../components/RaceScoreCard/types';
import type { TabSwitchOption } from '../components/TabSwitch';
import type { SessionType } from '../lib/sessions';
import { SESSION_LABELS, SESSION_LABELS_SHORT } from '../lib/sessions';

const meta = {
  title: 'Pages/Race Event Page',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function fakeRaceId(value: string) {
  return value as Id<'races'>;
}

function fakeDriverId(value: string) {
  return value as Id<'drivers'>;
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

function makeDrivers(): Array<DriverRef> {
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

function makeWeekendCardData(
  race: ReturnType<typeof makeRace>,
  opts: {
    hasPredictions: boolean;
    scoredSessions: Array<SessionType>;
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
  scoredSessions: Array<SessionType>;
}) {
  const isPredictable = race.status === 'upcoming' && isNextRace;
  const weekendSessions: ReadonlyArray<SessionType> = race.hasSprint
    ? ['sprint_quali', 'sprint', 'quali', 'race']
    : ['quali', 'race'];
  const [selectedSession, setSelectedSession] = useState<SessionType>(
    weekendSessions[weekendSessions.length - 1],
  );
  const cardData = useMemo(
    () =>
      makeWeekendCardData(race, {
        hasPredictions,
        scoredSessions,
      }),
    [race, hasPredictions, scoredSessions],
  );
  const selectedSessionCardData = useMemo(() => {
    const sessions = { ...cardData.sessions };
    for (const session of weekendSessions) {
      if (session !== selectedSession) {
        sessions[session] = null;
      }
    }
    return { ...cardData, sessions };
  }, [cardData, weekendSessions, selectedSession]);

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
    switch (session) {
      case 'quali':
        return race.qualiLockAt;
      case 'sprint_quali':
        return race.sprintQualiLockAt ?? race.predictionLockAt;
      case 'sprint':
        return race.sprintLockAt ?? race.predictionLockAt;
      case 'race':
        return race.predictionLockAt;
    }
  }

  function getSessionStartAt(session: SessionType) {
    switch (session) {
      case 'quali':
        return race.qualiStartAt;
      case 'sprint_quali':
        return race.sprintQualiStartAt ?? race.raceStartAt;
      case 'sprint':
        return race.sprintStartAt ?? race.raceStartAt;
      case 'race':
        return race.raceStartAt;
    }
  }

  const sessionTabOptions: Array<TabSwitchOption<SessionType>> =
    weekendSessions.map((session) => ({
      value: session,
      label: (
        <>
          <span className="hidden sm:inline">{SESSION_LABELS[session]}</span>
          <span className="sm:hidden">{SESSION_LABELS_SHORT[session]}</span>
        </>
      ),
    }));

  return (
    <RaceEventPageLayout
      race={race}
      isNextRace={isNextRace}
      isPredictable={isPredictable}
      isAuthLoaded={isAuthLoaded}
      isSignedIn={isSignedIn}
      isPredictionsLoading={false}
      hasPredictions={hasPredictions}
      hasPublishedResults={hasPublishedResults}
      allEventsScored={allEventsScored}
      pointsSoFar={pointsSoFar}
      scoredEventCount={scoredEventCount}
      weekendSessions={weekendSessions}
      selectedSession={selectedSession}
      onSelectedSessionChange={setSelectedSession}
      sessionTabOptions={sessionTabOptions}
      showSessionTabs={
        isPredictable && hasPredictions && weekendSessions.length > 1
      }
      trackTimeZone={race.timeZone}
      getSessionStartAt={getSessionStartAt}
      getSessionLockAt={getSessionLockAt}
      isSessionPublished={(session) => scoredSessions.includes(session)}
      randomizeControl={
        <Button size="sm" leftIcon={Dices}>
          Quick randomize
        </Button>
      }
      backLink={
        <div className="mb-4 inline-flex items-center gap-2 text-sm text-text-muted sm:mb-6">
          <ArrowLeft size={18} />
          Back to races
        </div>
      }
      initialTop5Content={
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 shrink-0 text-accent" />
            <h2 className="text-xl font-semibold text-text">
              Top 5 Predictions
            </h2>
          </div>
          <p className="text-text-muted">
            Pick your top 5 drivers. This prediction will apply to all sessions
            for the weekend.
          </p>
          <div className="rounded-lg border border-border bg-surface-muted/30 p-4 text-sm text-text-muted">
            Prediction form area
          </div>
        </div>
      }
      top5MainContent={
        <ErrorBoundary>
          <RaceScoreCard
            data={selectedSessionCardData}
            variant="full"
            viewer={{ isSignedIn: true, isOwner: true }}
            isNextRace={isNextRace}
          />
        </ErrorBoundary>
      }
      h2hContent={
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold text-text">
              Head-to-Head Predictions
            </h2>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted/30 p-4 text-sm text-text-muted">
            H2H prediction area
          </div>
        </div>
      }
      h2hResultsContent={
        <div className="p-4 text-sm text-text-muted">
          H2H results breakdown area
        </div>
      }
    />
  );
}

export const NoPredictionsYet: Story = {
  render: () => (
    <Scenario
      race={makeRace({
        slug: 'miami-2026',
        name: 'Miami Grand Prix',
        status: 'upcoming',
        hasSprint: true,
        raceStartAt: now + 3 * DAY,
      })}
      isNextRace={true}
      isAuthLoaded={true}
      isSignedIn={true}
      hasPredictions={false}
      hasPublishedResults={false}
      allEventsScored={false}
      scoredSessions={[]}
    />
  ),
};

export const HalfwayWeekend: Story = {
  render: () => (
    <Scenario
      race={makeRace({
        slug: 'miami-2026',
        name: 'Miami Grand Prix',
        status: 'locked',
        hasSprint: true,
        raceStartAt: now + 6 * HOUR,
      })}
      isNextRace={true}
      isAuthLoaded={true}
      isSignedIn={true}
      hasPredictions={true}
      hasPublishedResults={true}
      allEventsScored={false}
      scoredSessions={['sprint_quali', 'sprint', 'quali']}
    />
  ),
};

export const PostRaceWeekend: Story = {
  render: () => (
    <Scenario
      race={makeRace({
        slug: 'monaco-2026',
        name: 'Monaco Grand Prix',
        status: 'finished',
        hasSprint: false,
        raceStartAt: now - 7 * DAY,
      })}
      isNextRace={false}
      isAuthLoaded={true}
      isSignedIn={true}
      hasPredictions={true}
      hasPublishedResults={true}
      allEventsScored={true}
      scoredSessions={['quali', 'race']}
    />
  ),
};

export const UpcomingWithPredictions: Story = {
  render: () => (
    <Scenario
      race={makeRace({
        slug: 'canada-2026',
        name: 'Canadian Grand Prix',
        status: 'upcoming',
        hasSprint: true,
        raceStartAt: now + 4 * DAY,
      })}
      isNextRace={true}
      isAuthLoaded={true}
      isSignedIn={true}
      hasPredictions={true}
      hasPublishedResults={false}
      allEventsScored={false}
      scoredSessions={[]}
    />
  ),
};
