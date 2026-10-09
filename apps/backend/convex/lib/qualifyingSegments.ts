/**
 * Splitting a qualifying session's laps into Q1/Q2/Q3 (or SQ1/SQ2/SQ3), shared
 * by the live board and the result published from live timing.
 */

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Laps race control deleted, as `car:lapNumber` in OpenF1's numbering.
 *
 * "CAR 81 (PIA) TIME 1:53.171 DELETED - DOUBLE YELLOW AT TURN 5 LAP 3 20:34:06"
 * is OpenF1's lap 2: race control counts the lap the car is on when the time
 * is struck off, one past the lap that set it (checked against all five
 * deletions in Singapore's sprint qualifying). The stated time, when there is
 * one, picks the lap out directly; "LAP DELETED" rows carry none, so they fall
 * back to the lap number. A reinstatement names the same car and lap, so it
 * undoes one.
 */
function deletedLaps(raceControl: unknown[], laps: Record<string, unknown>[]) {
  const deleted = new Set<string>();
  for (const row of raceControl) {
    if (!record(row) || typeof row.message !== 'string') {
      continue;
    }
    const car = Number(/^CAR (\d+)\b/.exec(row.message)?.[1]);
    const lap = Number(/\bLAP (\d+)\b/.exec(row.message)?.[1]);
    if (!Number.isInteger(car) || !Number.isInteger(lap)) {
      continue;
    }
    const time = /\bTIME (?:(\d+):)?(\d+\.\d+)\b/.exec(row.message);
    const seconds = time ? Number(time[1] ?? 0) * 60 + Number(time[2]) : null;
    const byTime =
      seconds === null
        ? undefined
        : laps.find(
            (entry) =>
              entry.driver_number === car &&
              typeof entry.lap_duration === 'number' &&
              Math.abs(entry.lap_duration - seconds) < 0.0005,
          );
    const key = `${car}:${String(byTime?.lap_number ?? lap - 1)}`;
    if (/\bDELETED\b/.test(row.message)) {
      deleted.add(key);
    } else if (/\bREINSTATED\b/.test(row.message)) {
      deleted.delete(key);
    }
  }
  return deleted;
}

/**
 * Each driver's best lap in each qualifying segment, from OpenF1's laps and
 * race control.
 *
 * Each lap belongs to the segment it started in. A segment opens with race
 * control's first row tagged with it and closes at its chequered flag; laps
 * started between the two (in-laps, the wait before the next segment) count
 * for nothing. Pit-out laps and laps race control deleted are left out.
 *
 * Null when race control has no segment data, so a caller can fall back
 * rather than invent the split.
 */
export function qualifyingSegmentLaps(
  laps: unknown,
  raceControl: unknown,
): {
  /** Segments whose chequered flag has fallen, 0 to 3. */
  ended: number;
  /** driver → segment (1-3) → best lap */
  best: Map<number, Map<number, number>>;
  /** Every driver with a lap row, timed or not. */
  drivers: Set<number>;
} | null {
  if (!Array.isArray(laps) || !Array.isArray(raceControl)) {
    return null;
  }
  if (
    !raceControl.some(
      (row) => record(row) && typeof row.qualifying_phase === 'number',
    )
  ) {
    return null;
  }
  const chequers = raceControl
    .filter(
      (row): row is Record<string, unknown> =>
        record(row) && row.flag === 'CHEQUERED' && typeof row.date === 'string',
    )
    .map((row) => Date.parse(row.date as string))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const deleted = deletedLaps(raceControl, laps.filter(record));
  const opens = [1, 2, 3].map((segment) => {
    const times = raceControl
      .filter(
        (row): row is Record<string, unknown> =>
          record(row) &&
          row.qualifying_phase === segment &&
          typeof row.date === 'string',
      )
      .map((row) => Date.parse(row.date as string))
      .filter(Number.isFinite);
    return segment === 1 ? -Infinity : times.length ? Math.min(...times) : null;
  });
  /**
   * The segment a lap started in, or null between segments. The in-laps after
   * a chequered flag start after it, and counting them towards the next
   * segment put a 2:02 at the top of Q2 before Q2 had started.
   */
  function segmentAt(started: number) {
    for (let segment = 3; segment >= 1; segment -= 1) {
      const open = opens[segment - 1];
      const close = chequers[segment - 1];
      if (
        open !== null &&
        started >= open &&
        (close === undefined || started < close)
      ) {
        return segment;
      }
    }
    return null;
  }

  const best = new Map<number, Map<number, number>>();
  const drivers = new Set<number>();
  const lastSegment = new Map<number, number | null>();
  const sorted = laps
    .filter(record)
    .filter((lap) => typeof lap.driver_number === 'number')
    .sort((a, b) => Number(a.lap_number ?? 0) - Number(b.lap_number ?? 0));
  for (const lap of sorted) {
    const driver = lap.driver_number as number;
    drivers.add(driver);
    const started =
      typeof lap.date_start === 'string' ? Date.parse(lap.date_start) : NaN;
    // A lap with no start time inherits the segment of the driver's lap
    // before it: it cannot have started in an earlier one.
    const segment = Number.isFinite(started)
      ? segmentAt(started)
      : (lastSegment.get(driver) ?? 1);
    lastSegment.set(driver, segment);
    if (segment === null) {
      continue;
    }
    if (
      typeof lap.lap_duration !== 'number' ||
      !Number.isFinite(lap.lap_duration) ||
      // An out-lap starts in the pit lane: the timing screens never rank it.
      lap.is_pit_out_lap === true ||
      deleted.has(`${driver}:${String(lap.lap_number)}`)
    ) {
      continue;
    }
    const segments = best.get(driver) ?? new Map<number, number>();
    const current = segments.get(segment);
    if (current === undefined || lap.lap_duration < current) {
      segments.set(segment, lap.lap_duration);
    }
    best.set(driver, segments);
  }
  return { ended: Math.min(3, chequers.length), best, drivers };
}

/**
 * The best lap per segment for each driver, as `qualifyingSeconds` stores it
 * ([Q1, Q2, Q3], null where none was set). Null without segment data.
 */
export function qualifyingSecondsByDriver(
  laps: unknown,
  raceControl: unknown,
): Map<number, Array<number | null>> | null {
  const split = qualifyingSegmentLaps(laps, raceControl);
  if (!split) {
    return null;
  }
  return new Map(
    [...split.best].map(([driver, segments]) => [
      driver,
      [1, 2, 3].map((segment) => segments.get(segment) ?? null),
    ]),
  );
}
