import type { Id } from '../_generated/dataModel';

/** Number of leading positions the Top 5 game scores against. */
const TOP_FIVE = 5;

export type ClassificationMovement = {
  driverId: Id<'drivers'>;
  /** 1-indexed position in the stored classification, or null if newly present. */
  from: number | null;
  /** 1-indexed position in the official classification, or null if dropped. */
  to: number | null;
};

export type ClassificationChange = {
  /** The two orderings are not identical. */
  changed: boolean;
  /**
   * Both orderings contain exactly the same drivers. When false the difference
   * is a roster/data problem (a missing or extra driver) rather than a
   * stewards' decision, so it must not be applied automatically.
   */
  driverSetMatches: boolean;
  /** The first five positions differ — Top 5 points move. */
  affectsTopFive: boolean;
  /** A teammate pair's relative order flipped — H2H points move. */
  affectsH2H: boolean;
  /** Either game's points move, so players need telling. */
  affectsScoring: boolean;
  movements: ClassificationMovement[];
};

function positionsByDriver(
  classification: ReadonlyArray<Id<'drivers'>>,
): Map<Id<'drivers'>, number> {
  return new Map(
    classification.map((driverId, index) => [driverId, index + 1]),
  );
}

function sameOrder(
  a: ReadonlyArray<Id<'drivers'>>,
  b: ReadonlyArray<Id<'drivers'>>,
): boolean {
  return a.length === b.length && a.every((driverId, i) => driverId === b[i]);
}

/**
 * Compare a stored classification against the official one and describe what
 * moved. Used to decide whether a re-check should republish as a player-facing
 * amendment (points changed), a silent correction (order changed below anything
 * we score), or be escalated to an admin (the driver sets disagree).
 */
export function describeClassificationChange(
  stored: ReadonlyArray<Id<'drivers'>>,
  official: ReadonlyArray<Id<'drivers'>>,
  teamByDriverId: ReadonlyMap<Id<'drivers'>, string | undefined>,
): ClassificationChange {
  const changed = !sameOrder(stored, official);
  const storedPositions = positionsByDriver(stored);
  const officialPositions = positionsByDriver(official);

  const driverSetMatches =
    stored.length === official.length &&
    storedPositions.size === stored.length &&
    officialPositions.size === official.length &&
    stored.every((driverId) => officialPositions.has(driverId));

  const movements: ClassificationMovement[] = [];
  for (const driverId of new Set([...stored, ...official])) {
    const from = storedPositions.get(driverId) ?? null;
    const to = officialPositions.get(driverId) ?? null;
    if (from !== to) {
      movements.push({ driverId, from, to });
    }
  }

  const affectsTopFive = !sameOrder(
    stored.slice(0, TOP_FIVE),
    official.slice(0, TOP_FIVE),
  );

  // Group by team so we only inspect pairs that can be an H2H matchup.
  const byTeam = new Map<string, Array<Id<'drivers'>>>();
  for (const driverId of official) {
    const team = teamByDriverId.get(driverId);
    if (team === undefined) {
      continue;
    }
    const teammates = byTeam.get(team);
    if (teammates) {
      teammates.push(driverId);
    } else {
      byTeam.set(team, [driverId]);
    }
  }

  let affectsH2H = false;
  for (const teammates of byTeam.values()) {
    for (let i = 0; i < teammates.length && !affectsH2H; i += 1) {
      for (let j = i + 1; j < teammates.length; j += 1) {
        const a = teammates[i]!;
        const b = teammates[j]!;
        const storedA = storedPositions.get(a);
        const storedB = storedPositions.get(b);
        if (storedA === undefined || storedB === undefined) {
          // A driver we never had can only be a data problem, not a swap.
          continue;
        }
        const officialA = officialPositions.get(a)!;
        const officialB = officialPositions.get(b)!;
        if (storedA < storedB !== officialA < officialB) {
          affectsH2H = true;
          break;
        }
      }
    }
  }

  return {
    changed,
    driverSetMatches,
    affectsTopFive,
    affectsH2H,
    affectsScoring: affectsTopFive || affectsH2H,
    movements,
  };
}

export type ResolvedClassification =
  | {
      ok: true;
      classification: Array<Id<'drivers'>>;
      unranked: Array<Id<'drivers'>>;
    }
  | { ok: false; reason: string };

/**
 * Merge an official classification back onto our stored one.
 *
 * The official result ranks finishers and DNFs but leaves non-starters out
 * entirely, whereas we keep every driver in the classification so teammate H2H
 * always resolves. So the official order replaces the ranked part and our
 * unranked tail (the DNS drivers) is preserved behind it.
 *
 * Refuses when the two disagree about anything other than that tail: an
 * official driver we have never heard of, or one of ours going missing from the
 * middle of the order, is a data problem for an admin rather than a stewards'
 * decision.
 */
export function resolveOfficialClassification(
  stored: ReadonlyArray<Id<'drivers'>>,
  official: ReadonlyArray<Id<'drivers'>>,
): ResolvedClassification {
  const storedPositions = positionsByDriver(stored);
  const officialSet = new Set(official);

  if (officialSet.size !== official.length) {
    return { ok: false, reason: 'Official classification repeats a driver' };
  }

  const unknown = official.filter((driverId) => !storedPositions.has(driverId));
  if (unknown.length > 0) {
    return {
      ok: false,
      reason: `Official classification includes ${unknown.length} driver(s) missing from our result`,
    };
  }

  const unranked = stored.filter((driverId) => !officialSet.has(driverId));
  if (unranked.length === 0) {
    return { ok: true, classification: [...official], unranked };
  }

  // Every driver the official result leaves out must already sit behind every
  // driver it ranks, otherwise we would be silently demoting someone.
  const lastRankedPosition = Math.max(
    ...official.map((driverId) => storedPositions.get(driverId)!),
  );
  const misplaced = unranked.filter(
    (driverId) => storedPositions.get(driverId)! < lastRankedPosition,
  );
  if (misplaced.length > 0) {
    return {
      ok: false,
      reason: `Official classification omits ${misplaced.length} driver(s) from mid-order, not just the unranked tail`,
    };
  }

  return { ok: true, classification: [...official, ...unranked], unranked };
}
