/**
 * Session timing as F1's results write it, shared by the TRMNL plugin and
 * the results card posted to X, so the two cannot format it differently.
 */
export type SessionTimingRow = {
  position: number;
  /** Official timing, race and sprint only (`results.timing`). */
  gapToLeaderSeconds?: number | null;
  lapsDown?: number | null;
  durationSeconds?: number | null;
  /** Qualifying only: best lap in Q1, Q2, Q3, null where none was set. */
  qualifyingSeconds?: readonly (number | null)[] | null;
};

/**
 * The fastest lap in each part of a qualifying session ([Q1, Q2, Q3]), null
 * for a part nobody set a time in. Empty for a session without lap times.
 */
export function fastestPerPart(
  rows: readonly SessionTimingRow[],
): (number | null)[] {
  const best: (number | null)[] = [];
  for (const row of rows) {
    (row.qualifyingSeconds ?? []).forEach((lap, part) => {
      const current = best[part] ?? null;
      if (lap !== null && (current === null || lap < current)) {
        best[part] = lap;
      } else if (best[part] === undefined) {
        best[part] = null;
      }
    });
  }
  return best;
}

/**
 * A classification row's timing as F1's results write it: the winner's race
 * time, then each finisher's gap to the winner, or laps down.
 *
 * Qualifying reads the same way: pole's time, then everyone's gap. A
 * driver's lap is from the last part they set one in (Q3 for the top ten, Q2
 * for the next five, Q1 after that), and its gap is to the fastest lap of
 * that part (`partBest`, from {@link fastestPerPart}), as F1's timing gives
 * it: a Q2 lap measured against a Q3 lap would compare two different
 * tracks, and could come out negative. Without `partBest`, the lap itself.
 */
/**
 * The qualifying part (0 = Q1, 1 = Q2, 2 = Q3) a driver's timing comes from:
 * the last one they set a lap in. Null outside qualifying or with no lap.
 */
export function lastQualifyingPart(row: SessionTimingRow): number | null {
  const laps = row.qualifyingSeconds ?? [];
  for (let part = laps.length - 1; part >= 0; part -= 1) {
    if (laps[part] !== null) {
      return part;
    }
  }
  return null;
}

export function formatGap(
  row: SessionTimingRow,
  partBest: readonly (number | null)[] = [],
): string {
  const laps = row.qualifyingSeconds ?? [];
  const part = lastQualifyingPart(row) ?? -1;
  const qualifyingLap = part >= 0 ? laps[part] : null;
  if (qualifyingLap) {
    const best = partBest[part];
    return row.position === 1 || !best
      ? clockTime(qualifyingLap)
      : `+${clockTime(Math.max(0, qualifyingLap - best))}`;
  }
  if (row.lapsDown) {
    return `+${row.lapsDown} ${row.lapsDown === 1 ? 'lap' : 'laps'}`;
  }
  if (row.position === 1 && row.durationSeconds) {
    return clockTime(row.durationSeconds);
  }
  if (row.gapToLeaderSeconds && row.gapToLeaderSeconds > 0) {
    return `+${clockTime(row.gapToLeaderSeconds)}`;
  }
  return '';
}

/** 5882.143 → "1:38:02.143"; 64.221 → "1:04.221"; 0.196 → "0.196". */
function clockTime(seconds: number): string {
  const millis = Math.round(seconds * 1000);
  const hours = Math.floor(millis / 3_600_000);
  const minutes = Math.floor((millis % 3_600_000) / 60_000);
  const rest = ((millis % 60_000) / 1000).toFixed(3);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${rest.padStart(6, '0')}`;
  }
  if (minutes > 0) {
    return `${minutes}:${rest.padStart(6, '0')}`;
  }
  return rest;
}
