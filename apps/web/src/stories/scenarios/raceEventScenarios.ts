import type { SessionType } from '../../lib/sessions';

export type RaceEventScenarioName =
  | 'race_upcoming_signed_in_no_picks'
  | 'race_upcoming_signed_in_complete'
  | 'race_locked_signed_in_no_picks'
  | 'race_locked_signed_in_complete_no_results'
  | 'race_partial_results_standard'
  | 'race_finished_scored_standard';

export type RaceEventStoryScenario = {
  scenario: RaceEventScenarioName;
  storyName: string;
  race: {
    slug: string;
    name: string;
    status: 'upcoming' | 'locked' | 'finished';
    hasSprint: boolean;
    raceStartAtOffsetMs: number;
  };
  isNextRace: boolean;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  hasPredictions: boolean;
  hasPublishedResults: boolean;
  allEventsScored: boolean;
  scoredSessions: SessionType[];
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const raceEventStoryScenarios: Record<
  RaceEventScenarioName,
  RaceEventStoryScenario
> = {
  race_upcoming_signed_in_no_picks: {
    scenario: 'race_upcoming_signed_in_no_picks',
    storyName: 'Upcoming No Picks',
    race: {
      slug: 'scenario-upcoming-no-picks-2026',
      name: 'Scenario Upcoming No Picks Grand Prix',
      status: 'upcoming',
      hasSprint: false,
      raceStartAtOffsetMs: 3 * DAY,
    },
    isNextRace: true,
    isAuthLoaded: true,
    isSignedIn: true,
    hasPredictions: false,
    hasPublishedResults: false,
    allEventsScored: false,
    scoredSessions: [],
  },
  race_upcoming_signed_in_complete: {
    scenario: 'race_upcoming_signed_in_complete',
    storyName: 'Upcoming With Picks',
    race: {
      slug: 'scenario-upcoming-complete-2026',
      name: 'Scenario Upcoming Complete Grand Prix',
      status: 'upcoming',
      hasSprint: false,
      raceStartAtOffsetMs: 4 * DAY,
    },
    isNextRace: true,
    isAuthLoaded: true,
    isSignedIn: true,
    hasPredictions: true,
    hasPublishedResults: false,
    allEventsScored: false,
    scoredSessions: [],
  },
  race_locked_signed_in_no_picks: {
    scenario: 'race_locked_signed_in_no_picks',
    storyName: 'Locked No Picks',
    race: {
      slug: 'scenario-locked-no-picks-2026',
      name: 'Scenario Locked No Picks Grand Prix',
      status: 'locked',
      hasSprint: false,
      raceStartAtOffsetMs: -30 * 60 * 1000,
    },
    isNextRace: true,
    isAuthLoaded: true,
    isSignedIn: true,
    hasPredictions: false,
    hasPublishedResults: false,
    allEventsScored: false,
    scoredSessions: [],
  },
  race_locked_signed_in_complete_no_results: {
    scenario: 'race_locked_signed_in_complete_no_results',
    storyName: 'Locked With Picks',
    race: {
      slug: 'scenario-locked-complete-2026',
      name: 'Scenario Locked Complete Grand Prix',
      status: 'locked',
      hasSprint: false,
      raceStartAtOffsetMs: -30 * 60 * 1000,
    },
    isNextRace: true,
    isAuthLoaded: true,
    isSignedIn: true,
    hasPredictions: true,
    hasPublishedResults: false,
    allEventsScored: false,
    scoredSessions: [],
  },
  race_partial_results_standard: {
    scenario: 'race_partial_results_standard',
    storyName: 'Partial Results',
    race: {
      slug: 'scenario-partial-results-2026',
      name: 'Scenario Partial Results Grand Prix',
      status: 'locked',
      hasSprint: false,
      raceStartAtOffsetMs: -30 * 60 * 1000,
    },
    isNextRace: true,
    isAuthLoaded: true,
    isSignedIn: true,
    hasPredictions: true,
    hasPublishedResults: true,
    allEventsScored: false,
    scoredSessions: ['quali'],
  },
  race_finished_scored_standard: {
    scenario: 'race_finished_scored_standard',
    storyName: 'Finished Scored',
    race: {
      slug: 'scenario-finished-scored-2026',
      name: 'Scenario Finished Scored Grand Prix',
      status: 'finished',
      hasSprint: false,
      raceStartAtOffsetMs: -7 * DAY,
    },
    isNextRace: false,
    isAuthLoaded: true,
    isSignedIn: true,
    hasPredictions: true,
    hasPublishedResults: true,
    allEventsScored: true,
    scoredSessions: ['quali', 'race'],
  },
};

