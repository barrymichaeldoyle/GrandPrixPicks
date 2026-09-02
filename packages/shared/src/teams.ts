/**
 * Last season's constructors order, used only where this season's cannot be.
 *
 * The live table is the real source: `f1Standings.loadConstructorPoints`
 * computes it from the results we publish, and every server-side ordering runs
 * through it. This list breaks ties underneath that, which matters most before
 * a wheel has turned: with everyone level on zero, points alone would collapse
 * to alphabetical, and alphabetical is the arbitrary order we are trying to be
 * rid of. It also stands in for the client-side sorts that have no database.
 *
 * Final 2025 constructors' championship, with the two changes the 2026 grid
 * forces: Audi is Kick Sauber's entry rebranded so it takes Sauber's ninth,
 * and Cadillac is a new entry with no 2025 result so it sorts last.
 *
 * This list previously held the *current* 2026 order, hand-updated as rounds
 * were scored. That is why it read as stale against 2025 and was not: it was
 * being maintained, just against a different season than its comment claimed.
 * Anchoring it to last season's final result is what makes it stop needing
 * maintenance at all, now that the live table above it is doing the real work.
 */
const CONSTRUCTOR_STANDINGS_ORDER: string[] = [
  'McLaren',
  'Mercedes',
  'Red Bull Racing',
  'Ferrari',
  'Williams',
  'Racing Bulls',
  'Aston Martin',
  'Haas',
  'Audi',
  'Alpine',
  'Cadillac',
];

/**
 * The season's team-mate pairings, each valid over a range of rounds.
 *
 * The backend seeds `h2hMatchups` from this list, which is what makes it safe
 * for the UI to draw a duel before its data arrives: a round's pairings are
 * fixed, so only the outcome of a duel is ever unknown. The database rows stay
 * authoritative — a lineup change lands there first and simply corrects
 * whatever a loading state drew.
 *
 * Pairings are round-scoped because a mid-season driver swap is a real event
 * and rewriting a pairing in place would rewrite history with it: the race
 * pages resolve a past duel through its matchup row, so flipping Red Bull's
 * second seat from HAD to LAW would relabel eleven scored rounds of
 * Verstappen-vs-Hadjar as Verstappen-vs-Lawson, and would fold two separate
 * team-mate battles into one bogus record. `fromRound` is inclusive;
 * `toRound` is inclusive too, and omitting it means "still current".
 *
 * `driverTeamStints` in the backend is the underlying source of truth for who
 * drove for whom in a given round; this list is the pre-season shape of it and
 * what a client renders from before the database answers.
 */
export type TeammatePairing = {
  team: string;
  driver1Code: string;
  driver2Code: string;
  /** First round this pairing raced, inclusive. */
  fromRound: number;
  /** Last round this pairing raced, inclusive. Omitted while it is current. */
  toRound?: number;
};

export const TEAMMATE_PAIRINGS_2026: ReadonlyArray<TeammatePairing> = [
  { team: 'McLaren', driver1Code: 'NOR', driver2Code: 'PIA', fromRound: 1 },
  { team: 'Ferrari', driver1Code: 'LEC', driver2Code: 'HAM', fromRound: 1 },
  // Hadjar injured his wrist before round 12 (Dutch GP). Lawson steps up from
  // Racing Bulls to partner Verstappen; Tsunoda takes the vacated Racing Bulls
  // seat. Open-ended on purpose: Hadjar remains out for Monza, and his return
  // is a third pairing from whichever later round he is fit for, not an edit
  // to these.
  {
    team: 'Red Bull Racing',
    driver1Code: 'VER',
    driver2Code: 'HAD',
    fromRound: 1,
    toRound: 11,
  },
  {
    team: 'Red Bull Racing',
    driver1Code: 'VER',
    driver2Code: 'LAW',
    fromRound: 12,
  },
  { team: 'Mercedes', driver1Code: 'RUS', driver2Code: 'ANT', fromRound: 1 },
  {
    team: 'Aston Martin',
    driver1Code: 'ALO',
    driver2Code: 'STR',
    fromRound: 1,
  },
  { team: 'Alpine', driver1Code: 'GAS', driver2Code: 'COL', fromRound: 1 },
  { team: 'Williams', driver1Code: 'ALB', driver2Code: 'SAI', fromRound: 1 },
  {
    team: 'Racing Bulls',
    driver1Code: 'LAW',
    driver2Code: 'LIN',
    fromRound: 1,
    toRound: 11,
  },
  {
    team: 'Racing Bulls',
    driver1Code: 'TSU',
    driver2Code: 'LIN',
    fromRound: 12,
  },
  { team: 'Audi', driver1Code: 'HUL', driver2Code: 'BOR', fromRound: 1 },
  { team: 'Haas', driver1Code: 'OCO', driver2Code: 'BEA', fromRound: 1 },
  { team: 'Cadillac', driver1Code: 'BOT', driver2Code: 'PER', fromRound: 1 },
];

/**
 * A round below 1 is not a position in the calendar. Test-scenario races use
 * negative rounds as sentinels to sort themselves clear of the real season, so
 * the only sensible lineup for one is the current grid — answering "nobody was
 * racing" would leave those scenarios with no drivers and no duels at all.
 *
 * Normalising here rather than at each call site is deliberate: the failure it
 * prevents is silent (an empty grid, not an error), so it must not depend on
 * every caller remembering to do it.
 */
function effectiveRound(round: number): number {
  return round < 1 ? Number.MAX_SAFE_INTEGER : round;
}

/** Whether a round-scoped lineup record applies to `round`. */
export function coversRound(
  span: { fromRound?: number; toRound?: number },
  round: number,
): boolean {
  const effective = effectiveRound(round);
  return (
    effective >= (span.fromRound ?? 1) &&
    effective <= (span.toRound ?? Infinity)
  );
}

/** The pairings racing in a given round. */
export function pairingsForRound(round: number): TeammatePairing[] {
  return TEAMMATE_PAIRINGS_2026.filter((pairing) =>
    coversRound(pairing, round),
  );
}

/**
 * The pairings as they stand now: one per team, the retired ones dropped.
 *
 * For callers with no round to hand, such as a loading skeleton drawn before
 * any data arrives. Anything rendering a specific race should use
 * `pairingsForRound` with that race's round instead.
 */
export function currentPairings(): TeammatePairing[] {
  return TEAMMATE_PAIRINGS_2026.filter(
    (pairing) => pairing.toRound === undefined,
  );
}

/**
 * Order drivers by team, then by car number within a team.
 *
 * The pool on both apps used to hand-roll this identically, which is fine
 * until the tie-breaks drift apart. `teamPoints` is this season's
 * constructors table when the caller has it; without it the sort falls back to
 * last season, the same way `sortByConstructorStanding` does on the server.
 */
export function compareDriversByTeam<
  T extends {
    team?: string | null;
    number?: number | null;
    displayName: string;
  },
>(a: T, b: T, teamPoints?: ReadonlyMap<string, number>): number {
  const pointsA = teamPoints?.get(a.team ?? '') ?? 0;
  const pointsB = teamPoints?.get(b.team ?? '') ?? 0;
  if (pointsA !== pointsB) {
    return pointsB - pointsA;
  }
  const teamA = teamStandingsIndex(a.team);
  const teamB = teamStandingsIndex(b.team);
  if (teamA !== teamB) {
    return teamA - teamB;
  }
  const numA = a.number ?? 999;
  const numB = b.number ?? 999;
  if (numA !== numB) {
    return numA - numB;
  }
  return a.displayName.localeCompare(b.displayName);
}

/** Index of team in constructors order (teams not in list sort last). */
export function teamStandingsIndex(team: string | null | undefined): number {
  if (team == null || team === '') {
    return CONSTRUCTOR_STANDINGS_ORDER.length;
  }
  const i = CONSTRUCTOR_STANDINGS_ORDER.indexOf(team);
  return i === -1 ? CONSTRUCTOR_STANDINGS_ORDER.length : i;
}

export type DriverTeamStint = {
  driverCode: string;
  team: string;
  fromRound: number;
  toRound?: number;
};

/**
 * Every driver's team stints for the season, derived from the pairings above.
 *
 * Derived rather than declared so the grid cannot contradict itself: a pairing
 * already says which two drivers were in a team's cars over which rounds, and
 * writing that out a second time per driver is the kind of duplication that
 * drifts the moment somebody edits one list and not the other.
 *
 * Consecutive pairings for the same driver and team merge into one stint, so
 * Verstappen reads as a single unbroken Red Bull run rather than one stint per
 * team-mate he has had.
 */
export function driverStintsForSeason(): DriverTeamStint[] {
  const byDriver = new Map<string, DriverTeamStint[]>();

  for (const pairing of TEAMMATE_PAIRINGS_2026) {
    for (const driverCode of [pairing.driver1Code, pairing.driver2Code]) {
      const stint: DriverTeamStint = {
        driverCode,
        team: pairing.team,
        fromRound: pairing.fromRound,
        toRound: pairing.toRound,
      };
      const existing = byDriver.get(driverCode);
      if (existing) {
        existing.push(stint);
        continue;
      }
      byDriver.set(driverCode, [stint]);
    }
  }

  const merged: DriverTeamStint[] = [];
  for (const stints of byDriver.values()) {
    const ordered = [...stints].sort((a, b) => a.fromRound - b.fromRound);
    for (const stint of ordered) {
      const previous = merged[merged.length - 1];
      const joinsPrevious =
        previous !== undefined &&
        previous.driverCode === stint.driverCode &&
        previous.team === stint.team &&
        previous.toRound !== undefined &&
        previous.toRound + 1 === stint.fromRound;

      if (joinsPrevious) {
        previous.toRound = stint.toRound;
        continue;
      }
      merged.push({ ...stint });
    }
  }
  return merged;
}

/**
 * One seat that changed hands at a round boundary.
 *
 * A seat, not a driver, because that is the unit the game is played in: a duel
 * pick backs one side of a garage, so when the person in it changes the pick
 * moves with the seat (see `seed:migrateOrphanedH2HPicks`). Describing a
 * change as "this seat, from them to them" is therefore the shape that matches
 * what actually happened to a player's picks.
 *
 * `outDriverCode` is absent when a seat opens with nobody leaving it, which is
 * what a brand-new entry looks like.
 */
export type SeatMove = {
  team: string;
  outDriverCode?: string;
  inDriverCode: string;
};

/**
 * The seat moves that take effect at `round`, derived from the pairing list.
 *
 * A change is visible in `TEAMMATE_PAIRINGS_2026` as a pairing ending at
 * `round - 1` and another for the same team beginning at `round`, so the moves
 * are already in the declaration and do not need declaring twice. Diffing them
 * here means the announcement can never disagree with the grid it announces:
 * both read the same list.
 *
 * A driver who holds their seat across the boundary is not a move and is left
 * out, so a change that swaps one seat reports one move rather than a pair of
 * identical-looking rows.
 */
export function seatMovesForRound(round: number): SeatMove[] {
  const opening = TEAMMATE_PAIRINGS_2026.filter(
    (pairing) => pairing.fromRound === round,
  );
  const moves: SeatMove[] = [];

  for (const pairing of opening) {
    const closing = TEAMMATE_PAIRINGS_2026.find(
      (candidate) =>
        candidate.team === pairing.team && candidate.toRound === round - 1,
    );
    const before = closing
      ? [closing.driver1Code, closing.driver2Code]
      : ([] as string[]);
    const after = [pairing.driver1Code, pairing.driver2Code];

    // Whoever is in the car now but was not before has taken a seat. Pair them
    // with whoever left, positionally: with one seat changing there is exactly
    // one of each, and with both changing the pairing order is the only thing
    // relating them anyway.
    const arrived = after.filter((code) => !before.includes(code));
    const departed = before.filter((code) => !after.includes(code));

    for (const [index, inDriverCode] of arrived.entries()) {
      moves.push({
        team: pairing.team,
        outDriverCode: departed[index],
        inDriverCode,
      });
    }
  }

  return moves;
}

/** Every round at which the declared lineup changes hands. */
export function roundsWithSeatMoves(): number[] {
  const rounds = new Set<number>();
  for (const pairing of TEAMMATE_PAIRINGS_2026) {
    if (pairing.fromRound > 1) {
      rounds.add(pairing.fromRound);
    }
  }
  return [...rounds].sort((a, b) => a - b);
}
