/**
 * Three-letter team codes, the way timing screens print them, so a team sits
 * beside driver codes (NOR, PIA) without a second kind of label.
 */
const TEAM_CODES: Record<string, string> = {
  Mercedes: 'MER',
  McLaren: 'MCL',
  Ferrari: 'FER',
  'Red Bull Racing': 'RBR',
  Williams: 'WIL',
  Alpine: 'ALP',
  Audi: 'AUD',
  'Racing Bulls': 'RCB',
  Haas: 'HAA',
  'Aston Martin': 'AMR',
  Cadillac: 'CAD',
};

export function teamCode(team: string): string {
  return (
    TEAM_CODES[team] ??
    team
      .replace(/[^a-z]/gi, '')
      .slice(0, 3)
      .toUpperCase()
  );
}
