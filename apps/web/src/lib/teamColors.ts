// F1 2026 team colours. Authored in packages/shared/src/tokens.ts alongside the
// rest of the design tokens and re-exported here, so the ~10 existing import
// sites (components, routes and the server-side OG renderers) keep working and
// mobile stops carrying a second hand-maintained copy.
//
// Still a plain module with no React in it, so server code can use it.
import { inkForFill, readableTeamFill } from '@grandprixpicks/shared/teamFill';
import { fallbackTeamColor, teams } from '@grandprixpicks/shared/tokens';

export const TEAM_COLORS: Record<string, string> = teams;

export const FALLBACK_TEAM_COLOR = fallbackTeamColor;

/** A team's colour, or the fallback for a team not on the grid. */
export function teamColor(team: string | null | undefined): string {
  return (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
}

// The contrast math lives in shared so mobile fills the same liveries the
// same way; re-exported here for the existing web import sites.
export { inkForFill, readableTeamFill };

/**
 * Inline style for `.gpp-team-fill`: a driver the player has picked wears
 * their team's colour as the block's fill (see
 * `docs/design-display-register.md`, "Picked drivers").
 */
export function teamFillStyle(team: string | null | undefined) {
  const { fill, ink } = readableTeamFill(teamColor(team));
  return { '--team-fill': fill, '--team-ink': ink };
}
