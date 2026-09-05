import { describe, expect, it } from 'vitest';

import {
  deriveFinalOrder,
  evaluateLiveTimingGate,
  findPendingInvestigations,
  findSessionFinishedAt,
  LIVE_TIMING_GATE_ZONE,
  parseOpenF1PositionRows,
  parseRaceControlMessages,
  type RaceControlMessage,
} from './openF1LiveTiming';

function message(
  date: string,
  text: string,
  extra: Partial<RaceControlMessage> = {},
): RaceControlMessage {
  return {
    date,
    category: extra.category ?? 'Other',
    flag: extra.flag ?? null,
    message: text,
  };
}

const FLAG = '2026-09-05T15:00:00+00:00';
const FLAG_MS = Date.parse(FLAG);

describe('findSessionFinishedAt', () => {
  it('takes the last SessionStatus, not the first', () => {
    // Qualifying emits one per segment; the first is the end of Q1, and
    // publishing on it would score a third of the session.
    const finished = findSessionFinishedAt([
      message('2026-09-05T14:18:00+00:00', 'SESSION FINISHED', {
        category: 'SessionStatus',
      }),
      message('2026-09-05T14:42:00+00:00', 'SESSION FINISHED', {
        category: 'SessionStatus',
      }),
      message(FLAG, 'SESSION FINISHED', { category: 'SessionStatus' }),
    ]);
    expect(finished).toBe(FLAG_MS);
  });

  it('falls back to the chequered flag when no SessionStatus arrives', () => {
    expect(
      findSessionFinishedAt([
        message(FLAG, 'CHEQUERED FLAG', {
          category: 'Flag',
          flag: 'CHEQUERED',
        }),
      ]),
    ).toBe(FLAG_MS);
  });

  it('is undefined while the session is still running', () => {
    expect(
      findSessionFinishedAt([
        message('2026-09-05T14:30:00+00:00', 'GREEN LIGHT - PIT EXIT OPEN'),
      ]),
    ).toBeUndefined();
  });
});

describe('findPendingInvestigations', () => {
  it('opens on an announced post-session investigation', () => {
    const pending = findPendingInvestigations(
      [
        message(
          '2026-07-05T15:41:57+00:00',
          'FIA STEWARDS: INCIDENT INVOLVING CAR 55 (SAI) WILL BE INVESTIGATED AFTER THE RACE - SAFETY CAR INFRINGEMENT',
        ),
      ],
      FLAG_MS,
    );
    expect(pending.map((entry) => entry.driverNumber)).toEqual([55]);
  });

  it('captures both cars in a two-car message', () => {
    // A `CAR (\d+)` pattern matches "CAR 43" but not "CARS 43", so it silently
    // drops the second car and under-reports what the stewards are holding.
    const pending = findPendingInvestigations(
      [
        message(
          '2026-05-03T18:53:36+00:00',
          'FIA STEWARDS: TURN 17 INCIDENT INVOLVING CARS 16 (LEC) AND 63 (RUS) WILL BE INVESTIGATED AFTER THE RACE',
        ),
      ],
      FLAG_MS,
    );
    expect(
      pending.map((entry) => entry.driverNumber).sort((a, b) => a - b),
    ).toEqual([16, 63]);
  });

  it('closes on no further action', () => {
    const pending = findPendingInvestigations(
      [
        message(
          '2026-09-05T15:03:00+00:00',
          'FIA STEWARDS: INCIDENT INVOLVING CAR 30 (LAW) WILL BE INVESTIGATED AFTER THE RACE',
        ),
        message(
          '2026-09-05T15:04:02+00:00',
          'FIA STEWARDS: INCIDENT INVOLVING CAR 30 (LAW) NO FURTHER ACTION',
        ),
      ],
      FLAG_MS,
    );
    expect(pending).toEqual([]);
  });

  it('treats a served penalty as settled', () => {
    const pending = findPendingInvestigations(
      [
        message(
          '2026-07-05T14:08:28+00:00',
          'FIA STEWARDS: INCIDENT INVOLVING CAR 23 (ALB) WILL BE INVESTIGATED AFTER THE RACE',
        ),
        message(
          '2026-07-05T14:30:42+00:00',
          'FIA STEWARDS: PENALTY SERVED - 10 SECOND TIME PENALTY FOR CAR 23 (ALB)',
        ),
      ],
      FLAG_MS,
    );
    expect(pending).toEqual([]);
  });

  it('blocks on a penalty handed down after the flag', () => {
    // Monaco 2026: Hulkenberg was penalised without an investigation being
    // announced first, which reordered the finishers behind him.
    const pending = findPendingInvestigations(
      [
        message(
          '2026-06-07T15:28:20+00:00',
          'FIA STEWARDS: 10 SECOND TIME PENALTY FOR CAR 27 (HUL) - CAUSING A COLLISION',
        ),
      ],
      Date.parse('2026-06-07T15:26:43+00:00'),
    );
    expect(pending.map((entry) => entry.driverNumber)).toEqual([27]);
  });

  it('ignores a penalty served during the session', () => {
    // Already reflected in the running order, so it must not hold publication.
    const pending = findPendingInvestigations(
      [
        message(
          '2026-09-05T14:10:06+00:00',
          'FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 10 (GAS) - SPEEDING IN THE PIT LANE',
        ),
      ],
      FLAG_MS,
    );
    expect(pending).toEqual([]);
  });
});

describe('evaluateLiveTimingGate', () => {
  const order = [10, 63, 81, 16, 44, 3, 12, 43, 1, 41, 5, 87];

  it('is final when nothing is pending', () => {
    expect(evaluateLiveTimingGate({ order, pending: [] })).toEqual({
      provisional: false,
      pendingInZone: [],
    });
  });

  it('is provisional when a driver inside the zone is under investigation', () => {
    const result = evaluateLiveTimingGate({
      order,
      pending: [{ driverNumber: 16, message: 'under investigation' }],
    });
    expect(result.provisional).toBe(true);
    expect(result.pendingInZone.map((entry) => entry.driverNumber)).toEqual([
      16,
    ]);
  });

  it('is final when the only pending driver is outside the zone', () => {
    // A steward looking at P12 cannot move the top 5, so it is not worth
    // labelling the whole result provisional over it.
    const outside = order[LIVE_TIMING_GATE_ZONE + 2]!;
    const result = evaluateLiveTimingGate({
      order,
      pending: [{ driverNumber: outside, message: 'under investigation' }],
    });
    expect(result.provisional).toBe(false);
  });

  it('ignores a pending driver who is not in this session', () => {
    expect(
      evaluateLiveTimingGate({
        order,
        pending: [{ driverNumber: 99, message: 'under investigation' }],
      }).provisional,
    ).toBe(false);
  });
});

describe('deriveFinalOrder', () => {
  it('reduces the event log to the last position per driver', () => {
    const rows = parseOpenF1PositionRows([
      { driver_number: 10, position: 3, date: '2026-09-05T14:46:00+00:00' },
      { driver_number: 63, position: 1, date: '2026-09-05T14:46:00+00:00' },
      { driver_number: 10, position: 1, date: '2026-09-05T15:01:10+00:00' },
      { driver_number: 63, position: 2, date: '2026-09-05T15:01:10+00:00' },
      { driver_number: 81, position: 3, date: '2026-09-05T15:01:10+00:00' },
    ]);
    expect(deriveFinalOrder(rows)).toEqual([10, 63, 81]);
  });

  it('refuses a feed that is not yet a contiguous classification', () => {
    const rows = parseOpenF1PositionRows([
      { driver_number: 10, position: 1, date: '2026-09-05T15:01:10+00:00' },
      { driver_number: 63, position: 4, date: '2026-09-05T15:01:10+00:00' },
    ]);
    expect(() => deriveFinalOrder(rows)).toThrow(/contiguous/);
  });

  it('refuses an empty feed', () => {
    expect(() => deriveFinalOrder([])).toThrow(/empty/);
  });
});

describe('race control regressions from the 2026 season', () => {
  it('marks Monza qualifying final', () => {
    // Both post-flag lap deletions resolve to drivers outside the top 8, and
    // the two stewards items were closed before the settle window elapsed.
    const messages = parseRaceControlMessages([
      {
        date: FLAG,
        category: 'SessionStatus',
        flag: null,
        message: 'SESSION FINISHED',
      },
      {
        date: '2026-09-05T15:03:33+00:00',
        category: 'Other',
        flag: null,
        message:
          'FIA STEWARDS: Q1 INCIDENT INVOLVING CARS 12 (ANT) AND 30 (LAW) NO FURTHER ACTION',
      },
    ]);
    const finishedAt = findSessionFinishedAt(messages);
    const order = [10, 63, 81, 16, 44, 3, 12, 43, 1, 41];
    const pending = findPendingInvestigations(messages, finishedAt);
    expect(evaluateLiveTimingGate({ order, pending }).provisional).toBe(false);
  });

  it('flags Monaco provisional, where the live top 5 was wrong', () => {
    // Live timing said 12, 44, 6, 81, 30; the official top 5 was
    // 12, 44, 10, 6, 81. This is the one session in the 2026 season so far
    // that publishes a wrong top 5 and has to be amended afterwards, and the
    // provisional flag is what says so at the time.
    const messages = parseRaceControlMessages([
      {
        date: '2026-06-07T15:26:43+00:00',
        category: 'SessionStatus',
        flag: null,
        message: 'SESSION FINISHED',
      },
      {
        date: '2026-06-07T15:19:53+00:00',
        category: 'Other',
        flag: null,
        message:
          'FIA STEWARDS: INCIDENT INVOLVING CAR 6 (HAD) NO FURTHER ACTION - SAFETY CAR INFRINGEMENT',
      },
      {
        date: '2026-06-07T15:20:11+00:00',
        category: 'Other',
        flag: null,
        message:
          'FIA STEWARDS: INCIDENT INVOLVING CAR 6 (HAD) WILL BE INVESTIGATED AFTER THE RACE - RED FLAG INFRINGEMENT',
      },
      {
        date: '2026-06-07T15:28:20+00:00',
        category: 'Other',
        flag: null,
        message:
          'FIA STEWARDS: 10 SECOND TIME PENALTY FOR CAR 27 (HUL) - CAUSING A COLLISION',
      },
    ]);
    const finishedAt = findSessionFinishedAt(messages);
    const order = [12, 44, 6, 81, 30, 41, 10, 23, 31, 11, 27];
    const pending = findPendingInvestigations(messages, finishedAt);
    // HAD is what does the blocking: he is P3 in the live order and still
    // under investigation, having been cleared of a different matter first.
    // A later "no further action" must not clear an investigation opened
    // after it, which is why the replay is ordered by date.
    expect(
      pending.map((entry) => entry.driverNumber).sort((a, b) => a - b),
    ).toEqual([6, 27]);
    const gate = evaluateLiveTimingGate({ order, pending });
    expect(gate.provisional).toBe(true);
    expect(gate.pendingInZone.map((entry) => entry.driverNumber)).toEqual([6]);
  });
});
