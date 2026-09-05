/**
 * OpenF1's race control feed, read for two facts the result endpoints cannot
 * give us in time: when a session actually ended, and whether the stewards are
 * still holding something that would reorder the classification.
 *
 * Why this exists: `/v1/session_result` is the only endpoint carrying the
 * official classification, and it can lag the chequered flag by over an hour
 * (75 minutes at Monza 2026). The `/v1/position` feed settles within a couple
 * of minutes, but it is live timing rather than a result, so it misses
 * post-session stewards' decisions.
 *
 * Race control is what closes that gap. Every case where the position feed
 * disagreed with the official classification across the 2026 season so far was
 * a driver repositioned by a post-session penalty, and every one of those was
 * announced here first, as "WILL BE INVESTIGATED AFTER THE RACE". So the live
 * order is trustworthy exactly when nothing is pending against a driver near
 * the top of it.
 */

const FINISH_CATEGORY = 'SessionStatus';
const FINISH_MESSAGE = /FINISH/;
const CHEQUERED_FLAG = 'CHEQUERED';

/** "WILL BE INVESTIGATED AFTER THE RACE" / "... AFTER THE SESSION". */
const INVESTIGATION_OPENED = /WILL BE INVESTIGATED AFTER THE (RACE|SESSION)/;

/**
 * Anything that settles an open investigation without moving anyone. "PENALTY
 * SERVED" counts: a penalty taken during the session is already reflected in
 * the running order.
 */
const INVESTIGATION_CLOSED =
  /NO FURTHER ACTION|NO FURTHER INVESTIGATION|PENALTY SERVED/;

/**
 * A penalty handed down after the flag, which the position feed cannot know
 * about. Matched separately from an investigation because the stewards
 * sometimes skip straight to the penalty without announcing an investigation
 * first (Hulkenberg, Monaco 2026).
 */
const PENALTY_APPLIED =
  /\d+ SECOND TIME PENALTY|DRIVE THROUGH PENALTY|STOP AND GO|DISQUALIF/;

/**
 * Car numbers always appear beside the three-letter code — "CAR 3 (VER)",
 * "CARS 43 (COL) AND 44 (HAM)". Anchoring on the code rather than on the word
 * "CAR" is what picks up the second car in a two-car message; a `CAR (\d+)`
 * pattern silently drops it, which under-reports what the stewards are holding.
 */
const CAR_NUMBERS = /(\d+)\s*\([A-Z]{3}\)/g;

/**
 * How long after the flag the position feed is trusted. Below two minutes it
 * is still being written and yields a wrong top 5; five minutes also lets the
 * stewards' "no further action" messages land.
 *
 * Three rather than two only for margin: across the 2026 season every delay
 * from two minutes upward produced the same result, and one minute produced a
 * wrong top 5 in two qualifying sessions because the feed was still writing.
 */
export const LIVE_TIMING_SETTLE_MS = 3 * 60_000;

/**
 * How far down the order a pending investigation is considered relevant.
 *
 * Advisory only. It does NOT hold publication: a post-session penalty can take
 * hours to land, and making players wait that long for a result they watched
 * happen is worse than amending a small number of them afterwards. So this
 * marks a result as provisional and tells an admin where to look, and the
 * reconciler in resultsRecheck is what actually corrects the order.
 *
 * Top 5 is what scores and a penalty moves a driver a few places at most, so
 * eight covers the shift without flagging a steward looking at P17.
 */
export const LIVE_TIMING_GATE_ZONE = 8;

export type RaceControlMessage = {
  date: string;
  category: string | null;
  flag: string | null;
  message: string | null;
};

export type PendingInvestigation = {
  driverNumber: number;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRaceControlMessages(value: unknown): RaceControlMessage[] {
  if (!Array.isArray(value)) {
    throw new Error('OpenF1 race control response was not an array');
  }
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.date !== 'string') {
      return [];
    }
    if (!Number.isFinite(Date.parse(item.date))) {
      return [];
    }
    return [
      {
        date: item.date,
        category: typeof item.category === 'string' ? item.category : null,
        flag: typeof item.flag === 'string' ? item.flag : null,
        message: typeof item.message === 'string' ? item.message : null,
      },
    ];
  });
}

/**
 * When the session ended, in ms epoch, or undefined while it is still running.
 *
 * Takes the latest matching message rather than the first: qualifying emits a
 * SessionStatus per segment, so the first "finished" is the end of Q1.
 */
export function findSessionFinishedAt(
  messages: ReadonlyArray<RaceControlMessage>,
): number | undefined {
  const finishes = messages.filter(
    (row) =>
      row.category === FINISH_CATEGORY &&
      FINISH_MESSAGE.test((row.message ?? '').toUpperCase()),
  );
  const chequered = messages.filter((row) => row.flag === CHEQUERED_FLAG);
  const candidates = (finishes.length > 0 ? finishes : chequered).map((row) =>
    Date.parse(row.date),
  );
  return candidates.length > 0 ? Math.max(...candidates) : undefined;
}

function carNumbersIn(message: string): number[] {
  return [...message.matchAll(CAR_NUMBERS)].map((match) => Number(match[1]));
}

/**
 * Drivers the stewards still have something open against, replayed in order so
 * a later "no further action" clears an earlier investigation.
 */
export function findPendingInvestigations(
  messages: ReadonlyArray<RaceControlMessage>,
  finishedAt: number | undefined,
): PendingInvestigation[] {
  const pending = new Map<number, string>();
  const ordered = [...messages].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );

  for (const row of ordered) {
    const message = (row.message ?? '').toUpperCase();
    if (message === '') {
      continue;
    }
    const cars = carNumbersIn(message);
    if (cars.length === 0) {
      continue;
    }

    if (INVESTIGATION_OPENED.test(message)) {
      for (const car of cars) {
        pending.set(car, row.message ?? '');
      }
      continue;
    }
    if (INVESTIGATION_CLOSED.test(message)) {
      for (const car of cars) {
        pending.delete(car);
      }
      continue;
    }
    // A penalty applied after the flag is never reflected in live timing, so
    // it blocks on its own. Before the flag it is already in the running order.
    if (
      finishedAt !== undefined &&
      Date.parse(row.date) > finishedAt &&
      PENALTY_APPLIED.test(message)
    ) {
      for (const car of cars) {
        pending.set(car, row.message ?? '');
      }
    }
  }

  return [...pending].map(([driverNumber, message]) => ({
    driverNumber,
    message,
  }));
}

/**
 * Which pending investigations sit close enough to the front to be worth
 * flagging, and therefore whether this order should be treated as provisional.
 *
 * `provisional` is a label, not a veto — see LIVE_TIMING_GATE_ZONE.
 */
export function evaluateLiveTimingGate(args: {
  order: ReadonlyArray<number>;
  pending: ReadonlyArray<PendingInvestigation>;
  zone?: number;
}): { provisional: boolean; pendingInZone: PendingInvestigation[] } {
  const zone = args.zone ?? LIVE_TIMING_GATE_ZONE;
  const pendingInZone = args.pending.filter((entry) => {
    const index = args.order.indexOf(entry.driverNumber);
    return index >= 0 && index < zone;
  });
  return { provisional: pendingInZone.length > 0, pendingInZone };
}

// ---------------------------------------------------------------------------
// Position feed
//
// Lives here rather than in liveScoring so both the in-session scoreboard and
// the end-of-session publisher read one implementation. liveScoring re-exports
// these; importing the other way round would close a cycle, because liveScoring
// already depends on openF1Results.
// ---------------------------------------------------------------------------

export type PositionRow = {
  driverNumber: number;
  position: number;
  date: string;
};

export function parseOpenF1PositionRows(value: unknown): PositionRow[] {
  if (!Array.isArray(value)) {
    throw new Error('OpenF1 position response was not an array');
  }
  return value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.driver_number !== 'number' ||
      typeof item.position !== 'number' ||
      typeof item.date !== 'string' ||
      !Number.isInteger(item.driver_number) ||
      !Number.isInteger(item.position) ||
      item.position < 1 ||
      !Number.isFinite(Date.parse(item.date))
    ) {
      throw new Error('OpenF1 returned an invalid position row');
    }
    return {
      driverNumber: item.driver_number,
      position: item.position,
      date: item.date,
    };
  });
}

/** Merge an event-log page into the last-known position for each driver. */
export function reduceRunningOrder(
  existing: ReadonlyArray<{ driverNumber: number; position: number }>,
  rows: ReadonlyArray<PositionRow>,
) {
  const latestByDriver = new Map<number, { position: number; date: string }>();
  for (const row of rows) {
    const previous = latestByDriver.get(row.driverNumber);
    if (!previous || Date.parse(row.date) >= Date.parse(previous.date)) {
      latestByDriver.set(row.driverNumber, {
        position: row.position,
        date: row.date,
      });
    }
  }

  const byDriver = new Map(
    existing.map((entry) => [entry.driverNumber, entry.position]),
  );
  for (const [driverNumber, row] of latestByDriver) {
    byDriver.set(driverNumber, row.position);
  }
  const order = [...byDriver]
    .map(([driverNumber, position]) => ({ driverNumber, position }))
    .sort((a, b) => a.position - b.position);
  if (new Set(order.map((entry) => entry.position)).size !== order.length) {
    throw new Error('OpenF1 running order contains duplicate positions');
  }
  return order;
}

/**
 * The final running order as a plain list of driver numbers.
 *
 * Insists the feed covers a contiguous 1..N. A gap means the feed is still
 * being written, and publishing a partial grid would leave the tail unranked.
 */
export function deriveFinalOrder(rows: ReadonlyArray<PositionRow>): number[] {
  const order = reduceRunningOrder([], rows);
  if (order.length === 0) {
    throw new Error('OpenF1 position feed is empty for this session');
  }
  const expected = order.every((entry, index) => entry.position === index + 1);
  if (!expected) {
    throw new Error(
      'OpenF1 position feed is not a contiguous classification yet',
    );
  }
  return order.map((entry) => entry.driverNumber);
}
