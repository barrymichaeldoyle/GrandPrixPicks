import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import {
  getWebH2HDraftStorageKey,
  getWebTop5DraftStorageKey,
} from '@grandprixpicks/shared/picks';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import type { LandingPicksInitialStep } from './LandingPicks';
import { LandingPicks } from './LandingPicks';
import type { H2HMatchup } from '@/components/H2HMatchupGrid';
import {
  clearPredictionDraft,
  savePredictionDraft,
} from '@/lib/predictionDrafts';
import { fakeId, mockDrivers } from '@/storybook/fixtures';
import {
  StorybookMockProviders,
  buildStorybookConvexMocks,
} from '@/storybook/mockAppRuntime';

const MATCHUPS: H2HMatchup[] = [
  makeMatchup('mercedes', 'Mercedes', 'RUS', 'ANT'),
  makeMatchup('ferrari', 'Ferrari', 'LEC', 'HAM'),
  makeMatchup('mclaren', 'McLaren', 'NOR', 'PIA'),
  makeMatchup('red-bull', 'Red Bull Racing', 'VER', 'TSU'),
  makeMatchup('racing-bulls', 'Racing Bulls', 'HAD', 'LAW'),
  makeMatchup('alpine', 'Alpine', 'GAS', 'DOO'),
  makeMatchup('haas', 'Haas', 'OCO', 'BEA'),
  makeMatchup('audi', 'Audi', 'HUL', 'BOR'),
  makeMatchup('williams', 'Williams', 'ALB', 'SAI'),
  makeMatchup('aston-martin', 'Aston Martin', 'ALO', 'STR'),
  makeMatchup('cadillac', 'Cadillac', 'PER', 'BOT'),
];

const TOP_FIVE = [
  mockDrivers.NOR._id,
  mockDrivers.LEC._id,
  mockDrivers.VER._id,
  mockDrivers.PIA._id,
  mockDrivers.RUS._id,
];

const DRIVERS = Object.values(mockDrivers);

const convexMocks = buildStorybookConvexMocks({
  queries: [[api.h2h.getMatchupsForSeason, MATCHUPS]],
});

type DriverCode = keyof typeof mockDrivers;
type SeedState = 'empty' | 'top5' | 'mid-sequence' | 'complete';

function makeMatchup(
  id: string,
  team: string,
  driver1: DriverCode,
  driver2: DriverCode,
): H2HMatchup {
  return {
    _id: fakeId<'h2hMatchups'>(`storybook-${id}`),
    team,
    driver1: mockDrivers[driver1],
    driver2: mockDrivers[driver2],
  };
}

function buildSelections(count: number) {
  return Object.fromEntries(
    MATCHUPS.slice(0, count).map((matchup, index) => [
      matchup._id,
      index % 2 === 0 ? matchup.driver1._id : matchup.driver2._id,
    ]),
  ) as Record<string, Id<'drivers'>>;
}

function seedJourney(raceId: Id<'races'>, seedState: SeedState): Id<'races'> {
  const topFiveKey = getWebTop5DraftStorageKey(raceId);
  const h2hKey = getWebH2HDraftStorageKey(raceId);
  clearPredictionDraft(topFiveKey);
  clearPredictionDraft(h2hKey);

  if (seedState !== 'empty') {
    savePredictionDraft(topFiveKey, {
      picks: TOP_FIVE,
      updatedAt: new Date().toISOString(),
    });
  }
  if (seedState === 'mid-sequence' || seedState === 'complete') {
    savePredictionDraft(h2hKey, {
      selections: buildSelections(
        seedState === 'complete' ? MATCHUPS.length : 5,
      ),
      updatedAt: new Date().toISOString(),
    });
  }
  return raceId;
}

function JourneyPreview({
  storyId,
  seedState,
  initialStep = 'top5',
}: {
  storyId: string;
  seedState: SeedState;
  initialStep?: LandingPicksInitialStep;
}) {
  // Seed before the production forms mount. Each story gets its own race ID,
  // so moving between canvases never leaks draft state into another example.
  const [raceId] = useState(() =>
    seedJourney(fakeId<'races'>(`landing-journey-${storyId}`), seedState),
  );

  return (
    <StorybookMockProviders
      auth={{ isLoaded: true, isSignedIn: false }}
      convex={convexMocks}
    >
      <div className="-m-4 min-h-screen bg-page">
        <LandingPicks
          raceId={raceId}
          raceName="Spanish Grand Prix"
          raceSlug="spanish-2026"
          season={2026}
          sessionLabel="Qualifying"
          initialDrivers={DRIVERS}
          initialStep={initialStep}
        />
      </div>
    </StorybookMockProviders>
  );
}

const meta = {
  title: 'Routes/Home/Landing picks journey',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The exact signed-out production journey. Pick five drivers in order; the
 * card hands off automatically to all 11 teammate duels and finishes on the
 * combined account/save wall.
 */
export const CompleteJourney: Story = {
  render: () => <JourneyPreview storyId="complete-journey" seedState="empty" />,
};

/** The same end-to-end journey at the narrow viewport it is designed around. */
export const CompleteJourneyMobile: Story = {
  globals: {
    viewport: { value: 'mobile', isRotated: false },
  },
  render: () => (
    <JourneyPreview storyId="complete-journey-mobile" seedState="empty" />
  ),
};

/** The brief review/continue state shown once a signed-out Top 5 is complete. */
export const TopFiveHandoff: Story = {
  render: () => <JourneyPreview storyId="top-five-handoff" seedState="top5" />,
};

/** Jump straight to duel one with the Top 5 → H2H handoff message visible. */
export const FirstTeammateDuel: Story = {
  render: () => (
    <JourneyPreview
      storyId="first-teammate-duel"
      seedState="top5"
      initialStep="teammate-handoff"
    />
  ),
};

/** A genuine restored draft, useful for progress and return-visit styling. */
export const RestoredMidSequence: Story = {
  render: () => (
    <JourneyPreview
      storyId="restored-mid-sequence"
      seedState="mid-sequence"
      initialStep="teammate-handoff"
    />
  ),
};

/** The completed prediction card and its final signed-out conversion moment. */
export const CompletedCardSaveWall: Story = {
  render: () => (
    <JourneyPreview
      storyId="completed-card-save-wall"
      seedState="complete"
      initialStep="teammate-handoff"
    />
  ),
};
