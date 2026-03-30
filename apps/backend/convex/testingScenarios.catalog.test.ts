import { describe, expect, it } from 'vitest';

import {
  SCENARIOS,
  scenarioList,
  type ScenarioName,
} from './lib/testing/scenarioDefinitions';

const expectedScenarioNames: ScenarioName[] = [
  'race_upcoming_signed_in_no_picks',
  'race_upcoming_signed_in_complete',
  'race_upcoming_signed_in_top5_only',
  'race_upcoming_signed_in_complete_h2h',
  'race_locked_signed_in_no_picks',
  'race_locked_signed_in_complete_no_results',
  'race_locked_signed_in_complete_h2h_no_results',
  'race_partial_results_standard',
  'race_partial_results_sprint',
  'race_finished_scored_standard',
  'race_finished_scored_sprint',
  'race_finished_scored_h2h_standard',
];

describe('testing scenario catalog', () => {
  it('contains the expected named scenario matrix', () => {
    expect(Object.keys(SCENARIOS).sort()).toEqual(
      [...expectedScenarioNames].sort(),
    );
    expect(scenarioList.map((scenario) => scenario.name).sort()).toEqual(
      [...expectedScenarioNames].sort(),
    );
  });

  it('has unique names with descriptions and web coverage', () => {
    const names = scenarioList.map((scenario) => scenario.name);
    expect(new Set(names).size).toBe(names.length);

    for (const scenario of scenarioList) {
      expect(scenario.description.length).toBeGreaterThan(20);
      expect(scenario.surfaces).toContain('web');
      expect(scenario.tags.length).toBeGreaterThan(0);
    }
  });

  it('keeps sprint scenarios aligned with sprint metadata', () => {
    const sprintScenarios = scenarioList.filter((scenario) =>
      scenario.name.includes('sprint'),
    );

    expect(sprintScenarios.length).toBeGreaterThan(0);
    for (const scenario of sprintScenarios) {
      expect(scenario.weekendType).toBe('sprint');
    }
  });

  it('keeps H2H-complete scenarios aligned with complete prediction state', () => {
    const h2hCompleteScenarios = scenarioList.filter((scenario) =>
      scenario.name.includes('h2h'),
    );

    expect(h2hCompleteScenarios.length).toBeGreaterThan(0);
    for (const scenario of h2hCompleteScenarios) {
      expect(scenario.predictionShape).toBe('complete');
    }
  });

  it('covers the core race phases we expect to verify visually', () => {
    const phases = new Set(scenarioList.map((scenario) => scenario.racePhase));
    expect(phases).toEqual(
      new Set([
        'upcoming_open',
        'locked_pending_results',
        'partial_results',
        'finished_scored',
      ]),
    );
  });
});
