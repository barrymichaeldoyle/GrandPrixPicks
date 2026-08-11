import { describe, expect, it } from 'vitest';

import { isLeagueCreateLimitReached, PLAN_LEAGUE_LIMITS } from './entitlements';

const free = PLAN_LEAGUE_LIMITS.free;
const pro = PLAN_LEAGUE_LIMITS.pro;

describe('PLAN_LEAGUE_LIMITS', () => {
  it('gives free players exactly one public league', () => {
    expect(free.maxPublicLeaguesCreated).toBe(1);
  });

  it('gives pro players more of everything than free players', () => {
    expect(pro.maxPrivateLeaguesCreated).toBeGreaterThan(
      free.maxPrivateLeaguesCreated,
    );
    expect(pro.maxPublicLeaguesCreated).toBeGreaterThan(
      free.maxPublicLeaguesCreated,
    );
    expect(pro.maxPrivateLeaguesJoined).toBeGreaterThan(
      free.maxPrivateLeaguesJoined,
    );
    expect(pro.maxPublicLeaguesJoined).toBeGreaterThan(
      free.maxPublicLeaguesJoined,
    );
  });
});

describe('isLeagueCreateLimitReached', () => {
  it('lets a free player create their first public league', () => {
    expect(
      isLeagueCreateLimitReached(free, 'public', {
        createdPrivate: 0,
        createdPublic: 0,
      }),
    ).toBe(false);
  });

  it('blocks a free player from a second public league', () => {
    expect(
      isLeagueCreateLimitReached(free, 'public', {
        createdPrivate: 0,
        createdPublic: 1,
      }),
    ).toBe(true);
  });

  it('does not let public usage eat into the private allowance', () => {
    expect(
      isLeagueCreateLimitReached(free, 'private', {
        createdPrivate: 0,
        createdPublic: 1,
      }),
    ).toBe(false);
  });

  it('blocks a free player at the private creation limit', () => {
    expect(
      isLeagueCreateLimitReached(free, 'private', {
        createdPrivate: free.maxPrivateLeaguesCreated,
        createdPublic: 0,
      }),
    ).toBe(true);
  });

  it('never trips on an infinite limit', () => {
    expect(
      isLeagueCreateLimitReached(
        { ...pro, maxPublicLeaguesCreated: Number.POSITIVE_INFINITY },
        'public',
        { createdPrivate: 0, createdPublic: 10_000 },
      ),
    ).toBe(false);
  });
});
