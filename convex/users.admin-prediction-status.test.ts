import { describe, expect, it } from 'vitest';

import { buildAdminPredictionStatus } from './users';

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

describe('buildAdminPredictionStatus', () => {
  it('computes Top 5 and H2H totals and per-user progress', () => {
    const requiredSessions = ['quali', 'race'] as const;

    const top5ByUser = new Map([
      [
        'u1',
        {
          sessions: new Set<SessionType>(['quali', 'race']),
          latestSubmittedAt: 2000,
        },
      ],
      [
        'u2',
        { sessions: new Set<SessionType>(['quali']), latestSubmittedAt: 1500 },
      ],
    ]);

    const h2hByUser = new Map([
      [
        'u1',
        { sessions: new Set<SessionType>(['quali']), latestSubmittedAt: 2100 },
      ],
      [
        'u2',
        {
          sessions: new Set<SessionType>(['quali', 'race']),
          latestSubmittedAt: 2200,
        },
      ],
    ]);

    const result = buildAdminPredictionStatus({
      users: [
        { _id: 'u1', username: 'alice', displayName: 'Alice' },
        { _id: 'u2', username: 'bob', displayName: 'Bob' },
        { _id: 'u3', email: 'c@example.com' },
      ],
      requiredSessions: [...requiredSessions],
      top5ByUser,
      h2hByUser,
    });

    expect(result.totals).toEqual({
      totalUsers: 3,
      usersStarted: 2,
      usersCompleted: 1,
      usersPending: 2,
      h2hUsersStarted: 2,
      h2hUsersCompleted: 1,
      h2hUsersPending: 2,
    });

    expect(result.users.map((u) => u.userId)).toEqual(['u1', 'u2', 'u3']);
    expect(result.users[0]).toMatchObject({
      userId: 'u1',
      completedSessions: 2,
      h2hCompletedSessions: 1,
      hasCompleted: true,
      h2hHasCompleted: false,
    });
    expect(result.users[1]).toMatchObject({
      userId: 'u2',
      completedSessions: 1,
      h2hCompletedSessions: 2,
      hasCompleted: false,
      h2hHasCompleted: true,
    });
    expect(result.users[2]).toMatchObject({
      userId: 'u3',
      completedSessions: 0,
      h2hCompletedSessions: 0,
      hasStarted: false,
      h2hHasStarted: false,
    });
  });

  it('sorts completed users first, then by completed sessions, then label', () => {
    const result = buildAdminPredictionStatus({
      users: [
        { _id: 'u2', displayName: 'Zulu' },
        { _id: 'u1', displayName: 'Alpha' },
        { _id: 'u3', displayName: 'Mike' },
      ],
      requiredSessions: ['quali', 'race'],
      top5ByUser: new Map([
        [
          'u2',
          { sessions: new Set<SessionType>(['quali']), latestSubmittedAt: 1 },
        ],
        [
          'u1',
          {
            sessions: new Set<SessionType>(['quali', 'race']),
            latestSubmittedAt: 2,
          },
        ],
      ]),
      h2hByUser: new Map(),
    });

    expect(result.users.map((u) => u.userId)).toEqual(['u1', 'u2', 'u3']);
  });
});
