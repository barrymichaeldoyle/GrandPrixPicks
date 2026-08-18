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
 * It had drifted badly: Mercedes was first and Williams ninth, when Mercedes
 * finished second and Williams fifth.
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
 * The season's teammate pairings — the H2H matchups, in driver code form.
 *
 * The backend seeds `h2hMatchups` from this list, which is what makes it safe
 * for the UI to draw a duel before its data arrives: the pairings are fixed for
 * the season, so only the outcome of a duel is ever unknown. The database rows
 * stay authoritative — a lineup change lands there first and simply corrects
 * whatever a loading state drew.
 */
export const TEAMMATE_PAIRINGS_2026: ReadonlyArray<{
  team: string;
  driver1Code: string;
  driver2Code: string;
}> = [
  { team: 'McLaren', driver1Code: 'NOR', driver2Code: 'PIA' },
  { team: 'Ferrari', driver1Code: 'LEC', driver2Code: 'HAM' },
  { team: 'Red Bull Racing', driver1Code: 'VER', driver2Code: 'HAD' },
  { team: 'Mercedes', driver1Code: 'RUS', driver2Code: 'ANT' },
  { team: 'Aston Martin', driver1Code: 'ALO', driver2Code: 'STR' },
  { team: 'Alpine', driver1Code: 'GAS', driver2Code: 'COL' },
  { team: 'Williams', driver1Code: 'ALB', driver2Code: 'SAI' },
  { team: 'Racing Bulls', driver1Code: 'LAW', driver2Code: 'LIN' },
  { team: 'Audi', driver1Code: 'HUL', driver2Code: 'BOR' },
  { team: 'Haas', driver1Code: 'OCO', driver2Code: 'BEA' },
  { team: 'Cadillac', driver1Code: 'BOT', driver2Code: 'PER' },
];

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
