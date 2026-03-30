import { v } from 'convex/values';

export const scenarioNameValidator = v.union(
  v.literal('race_upcoming_signed_in_no_picks'),
  v.literal('race_upcoming_signed_in_complete'),
  v.literal('race_locked_signed_in_no_picks'),
  v.literal('race_locked_signed_in_complete_no_results'),
  v.literal('race_partial_results_standard'),
  v.literal('race_finished_scored_standard'),
);

export type ScenarioName =
  | 'race_upcoming_signed_in_no_picks'
  | 'race_upcoming_signed_in_complete'
  | 'race_locked_signed_in_no_picks'
  | 'race_locked_signed_in_complete_no_results'
  | 'race_partial_results_standard'
  | 'race_finished_scored_standard';

export type ScenarioSurface = 'web' | 'story' | 'e2e';
export type ScenarioActorRole = 'primary' | 'admin';
export type RacePhase =
  | 'upcoming_open'
  | 'locked_pending_results'
  | 'partial_results'
  | 'finished_scored';
export type PredictionShape = 'none' | 'complete';
export type ResultsShape = 'none' | 'partial' | 'complete';
export type WeekendType = 'standard' | 'sprint';

export type ScenarioDefinition = {
  name: ScenarioName;
  description: string;
  surfaces: ScenarioSurface[];
  tags: string[];
  actorRole: ScenarioActorRole;
  weekendType: WeekendType;
  racePhase: RacePhase;
  predictionShape: PredictionShape;
  resultsShape: ResultsShape;
  signedIn: boolean;
  hasRank: boolean;
};

export const SCENARIOS: Record<ScenarioName, ScenarioDefinition> = {
  race_upcoming_signed_in_no_picks: {
    name: 'race_upcoming_signed_in_no_picks',
    description:
      'Primary user is signed in, the next standard weekend is open, and no predictions have been made yet.',
    surfaces: ['web', 'story', 'e2e'],
    tags: ['race-detail', 'upcoming', 'top5'],
    actorRole: 'primary',
    weekendType: 'standard',
    racePhase: 'upcoming_open',
    predictionShape: 'none',
    resultsShape: 'none',
    signedIn: true,
    hasRank: false,
  },
  race_upcoming_signed_in_complete: {
    name: 'race_upcoming_signed_in_complete',
    description:
      'Primary user is signed in, the next standard weekend is open, and complete top 5 predictions exist for quali and race.',
    surfaces: ['web', 'story', 'e2e'],
    tags: ['race-detail', 'upcoming', 'top5'],
    actorRole: 'primary',
    weekendType: 'standard',
    racePhase: 'upcoming_open',
    predictionShape: 'complete',
    resultsShape: 'none',
    signedIn: true,
    hasRank: false,
  },
  race_locked_signed_in_no_picks: {
    name: 'race_locked_signed_in_no_picks',
    description:
      'Primary user is signed in, all standard weekend sessions are locked, and no predictions were submitted.',
    surfaces: ['web', 'story', 'e2e'],
    tags: ['race-detail', 'locked', 'top5'],
    actorRole: 'primary',
    weekendType: 'standard',
    racePhase: 'locked_pending_results',
    predictionShape: 'none',
    resultsShape: 'none',
    signedIn: true,
    hasRank: false,
  },
  race_locked_signed_in_complete_no_results: {
    name: 'race_locked_signed_in_complete_no_results',
    description:
      'Primary user is signed in, all standard weekend sessions are locked, predictions exist, and no results are published yet.',
    surfaces: ['web', 'story', 'e2e'],
    tags: ['race-detail', 'locked', 'top5'],
    actorRole: 'primary',
    weekendType: 'standard',
    racePhase: 'locked_pending_results',
    predictionShape: 'complete',
    resultsShape: 'none',
    signedIn: true,
    hasRank: false,
  },
  race_partial_results_standard: {
    name: 'race_partial_results_standard',
    description:
      'Primary user is signed in on a standard weekend, predictions exist, qualifying has published and been scored, and the race is still pending.',
    surfaces: ['web', 'story', 'e2e'],
    tags: ['race-detail', 'results', 'partial'],
    actorRole: 'primary',
    weekendType: 'standard',
    racePhase: 'partial_results',
    predictionShape: 'complete',
    resultsShape: 'partial',
    signedIn: true,
    hasRank: true,
  },
  race_finished_scored_standard: {
    name: 'race_finished_scored_standard',
    description:
      'Primary user is signed in on a completed standard weekend with published and scored qualifying and race results.',
    surfaces: ['web', 'story', 'e2e'],
    tags: ['race-detail', 'results', 'finished'],
    actorRole: 'primary',
    weekendType: 'standard',
    racePhase: 'finished_scored',
    predictionShape: 'complete',
    resultsShape: 'complete',
    signedIn: true,
    hasRank: true,
  },
};

export const scenarioList = Object.values(SCENARIOS);

export function getScenarioDefinition(name: ScenarioName): ScenarioDefinition {
  return SCENARIOS[name];
}

