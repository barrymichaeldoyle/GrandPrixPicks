import { describe, expect, it } from 'vitest';

import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
  raceWriteupPhaseLabel,
  raceWriteupPrimaryAction,
} from './raceWriteupPhase';

const FP1 = 1_000;
const QUALIFYING = 2_000;
const RACE = 3_000;

function race(
  overrides: Partial<Parameters<typeof getRaceWriteupPhase>[0]> = {},
): Parameters<typeof getRaceWriteupPhase>[0] {
  return {
    status: 'upcoming',
    fp1StartAt: FP1,
    qualiStartAt: QUALIFYING,
    qualiLockAt: QUALIFYING,
    predictionLockAt: RACE,
    raceStartAt: RACE,
    ...overrides,
  };
}

describe('race write-up lifecycle', () => {
  it.each([
    [FP1 - 1, 'preview'],
    [FP1, 'evidence'],
    [QUALIFYING, 'race-picks'],
    [RACE, 'picks-locked'],
  ] as const)('uses session boundaries at %s', (now, phase) => {
    expect(getRaceWriteupPhase(race(), now)).toBe(phase);
  });

  it('uses the database status for terminal states', () => {
    expect(getRaceWriteupPhase(race({ status: 'finished' }), FP1 - 1)).toBe(
      'finished',
    );
    expect(getRaceWriteupPhase(race({ status: 'cancelled' }), FP1 - 1)).toBe(
      'cancelled',
    );
  });

  it('keeps race picks open after qualifying results lock the weekend', () => {
    expect(getRaceWriteupPhase(race({ status: 'locked' }), QUALIFYING)).toBe(
      'race-picks',
    );
  });

  it('falls back to scheduled starts when optional lock data is absent', () => {
    expect(
      getRaceWriteupPhase(
        race({ qualiLockAt: undefined, predictionLockAt: 0 }),
        QUALIFYING,
      ),
    ).toBe('race-picks');
    expect(
      getRaceWriteupPhase(
        race({ qualiLockAt: undefined, predictionLockAt: 0 }),
        RACE,
      ),
    ).toBe('picks-locked');
  });

  it('keeps live feeds to phases where they can change a pick', () => {
    expect(isRaceWriteupLive('preview')).toBe(true);
    expect(isRaceWriteupLive('evidence')).toBe(true);
    expect(isRaceWriteupLive('race-picks')).toBe(true);
    expect(isRaceWriteupLive('picks-locked')).toBe(false);
    expect(isRaceWriteupLive('finished')).toBe(false);
    expect(isRaceWriteupLive('cancelled')).toBe(false);
  });

  it('provides direct labels and actions for every phase', () => {
    expect(raceWriteupPhaseLabel('evidence')).toBe('Practice');
    expect(raceWriteupPhaseLabel('race-picks')).toBe('Race picks');
    expect(raceWriteupPhaseLabel('finished')).toBe('Results');
    expect(raceWriteupPrimaryAction('preview', 'Monza')).toBe(
      'Make your Monza picks',
    );
    expect(raceWriteupPrimaryAction('race-picks', 'Monza')).toBe(
      'Make your race picks',
    );
    expect(raceWriteupPrimaryAction('finished', 'Monza', true)).toBe(
      'See results',
    );
    expect(
      raceWriteupHeroSummary(
        'picks-locked',
        'The Italian Grand Prix',
        'Live summary',
      ),
    ).toBe(
      'The Italian Grand Prix picks are locked. Results will appear on the race page after they are published.',
    );
    expect(
      raceWriteupHeroSummary(
        'finished',
        'The Italian Grand Prix',
        'Live summary',
      ),
    ).toBe(
      'The Italian Grand Prix is complete. Official results and scores are on the race page.',
    );
    expect(
      raceWriteupHeroSummary(
        'cancelled',
        'The Italian Grand Prix',
        'Live summary',
      ),
    ).toBe('The Italian Grand Prix was called off.');
  });
});
