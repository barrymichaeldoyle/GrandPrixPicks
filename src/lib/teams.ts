/**
 * Team order by constructors standings (e.g. previous season).
 * Used to sort drivers in the prediction pool and to match H2H matchup order.
 */
export const CONSTRUCTOR_STANDINGS_ORDER: Array<string> = [
  'McLaren',
  'Ferrari',
  'Red Bull Racing',
  'Mercedes',
  'Aston Martin',
  'Alpine',
  'Williams',
  'Racing Bulls',
  'Audi',
  'Haas',
  'Cadillac',
];

/** Index of team in constructors order (teams not in list sort last). */
export function teamStandingsIndex(team: string | null | undefined): number {
  if (team == null || team === '') return CONSTRUCTOR_STANDINGS_ORDER.length;
  const i = CONSTRUCTOR_STANDINGS_ORDER.indexOf(team);
  return i === -1 ? CONSTRUCTOR_STANDINGS_ORDER.length : i;
}
