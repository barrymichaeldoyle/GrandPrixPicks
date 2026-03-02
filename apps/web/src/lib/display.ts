/** Short display names for teams (e.g. "Red Bull Racing" → "Red Bull"). */
const TEAM_DISPLAY_NAMES: Record<string, string> = {
  'Red Bull Racing': 'Red Bull',
};

/**
 * Returns the team name to show in the UI. Use for all user-facing team labels.
 * Color lookups and data should still use the full team name.
 */
export function displayTeamName(team: string | null | undefined): string {
  if (team == null || team === '') {
    return '';
  }
  return TEAM_DISPLAY_NAMES[team] ?? team;
}
