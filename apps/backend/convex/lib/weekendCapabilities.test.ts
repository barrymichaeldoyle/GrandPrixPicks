import { describe, expect, it } from 'vitest';

import { deriveSessionCapability } from './weekendCapabilities';

const NOW = 1_760_000_000_000;
const OPEN_LOCK = NOW + 60 * 60 * 1000;
const PASSED_LOCK = NOW - 60 * 60 * 1000;

const base = {
  sessionType: 'race' as const,
  lockAt: OPEN_LOCK,
  now: NOW,
  isSignedIn: true,
  raceIsSubmittable: true,
  hasResult: false,
  hasTop5: false,
  hasH2H: false,
};

describe('deriveSessionCapability', () => {
  it('allows create and edit for an open session on a submittable race', () => {
    const cap = deriveSessionCapability(base);
    expect(cap).toMatchObject({
      canCreate: true,
      canEdit: true,
      isLocked: false,
      denialReason: null,
      lockAt: OPEN_LOCK,
    });
  });

  it('refuses writes once the session lock passes', () => {
    const cap = deriveSessionCapability({ ...base, lockAt: PASSED_LOCK });
    expect(cap).toMatchObject({
      canCreate: false,
      canEdit: false,
      isLocked: true,
      denialReason: 'session_locked',
    });
  });

  it('refuses writes at exactly the lock instant', () => {
    const cap = deriveSessionCapability({ ...base, lockAt: NOW });
    expect(cap.isLocked).toBe(true);
    expect(cap.denialReason).toBe('session_locked');
  });

  it('refuses writes for signed-out viewers even when the session is open', () => {
    const cap = deriveSessionCapability({ ...base, isSignedIn: false });
    expect(cap).toMatchObject({
      canCreate: false,
      canEdit: false,
      isLocked: false,
      denialReason: 'sign_in',
    });
  });

  it('refuses writes when the race is no longer submittable (locked/finished)', () => {
    const cap = deriveSessionCapability({ ...base, raceIsSubmittable: false });
    expect(cap).toMatchObject({
      canCreate: false,
      canEdit: false,
      denialReason: 'race_not_submittable',
    });
  });

  it('prioritizes sign_in over other denial reasons', () => {
    const cap = deriveSessionCapability({
      ...base,
      isSignedIn: false,
      lockAt: PASSED_LOCK,
      raceIsSubmittable: false,
    });
    expect(cap.denialReason).toBe('sign_in');
  });

  it('treats a missing lock time as never locked', () => {
    const cap = deriveSessionCapability({ ...base, lockAt: undefined });
    expect(cap.lockAt).toBeNull();
    expect(cap.isLocked).toBe(false);
    expect(cap.canEdit).toBe(true);
  });

  it('passes viewer pick and result state through untouched', () => {
    const cap = deriveSessionCapability({
      ...base,
      lockAt: PASSED_LOCK,
      hasResult: true,
      hasTop5: true,
      hasH2H: true,
    });
    expect(cap).toMatchObject({
      hasResult: true,
      hasTop5: true,
      hasH2H: true,
    });
  });

  describe('mid-weekend entry (plan contract: first save after earlier locks)', () => {
    function sprintWeekendAt(now: number) {
      // Sprint weekend order: sprint_quali -> sprint -> quali -> race.
      // Fixture time sits between sprint (locked) and quali (open).
      const locks = {
        sprint_quali: now - 3 * 60 * 60 * 1000,
        sprint: now - 1 * 60 * 60 * 1000,
        quali: now + 2 * 60 * 60 * 1000,
        race: now + 26 * 60 * 60 * 1000,
      } as const;
      return (['sprint_quali', 'sprint', 'quali', 'race'] as const).map(
        (sessionType) =>
          deriveSessionCapability({
            ...base,
            sessionType,
            lockAt: locks[sessionType],
            now,
          }),
      );
    }

    it('a user joining mid-sprint-weekend can write only the still-open sessions', () => {
      const [sprintQuali, sprint, quali, race] = sprintWeekendAt(NOW);
      expect(sprintQuali.canCreate).toBe(false);
      expect(sprintQuali.denialReason).toBe('session_locked');
      expect(sprint.canCreate).toBe(false);
      expect(quali.canCreate).toBe(true);
      expect(race.canCreate).toBe(true);
    });

    it('locked sessions stay readable (capability carries state, not visibility)', () => {
      const [sprintQuali] = sprintWeekendAt(NOW);
      expect(sprintQuali.isLocked).toBe(true);
      expect(sprintQuali.lockAt).not.toBeNull();
    });
  });
});
