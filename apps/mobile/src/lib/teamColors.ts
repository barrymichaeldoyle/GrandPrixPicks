// F1 2026 team colours, re-exported from the shared design tokens.
//
// This used to be a hand-maintained copy of the web list with a comment saying
// it mirrored DriverBadge.tsx. The two still agreed, but nothing was keeping
// them that way — the same setup that let the OG share cards drift into a
// palette the product had abandoned.
import { readableTeamFill } from '@grandprixpicks/shared/teamFill';
import { fallbackTeamColor, teams } from '@grandprixpicks/shared/tokens';

export function getTeamColor(team?: string | null): string {
  return (team && teams[team as keyof typeof teams]) || fallbackTeamColor;
}

/**
 * A picked driver wears their team's colour as a fill, with the ink that reads
 * on it (docs/design-display-register.md, "Picked drivers"). The contrast math
 * is shared with web, so both apps darken Ferrari and Audi red the same way.
 */
export function getTeamFill(team?: string | null): {
  fill: string;
  ink: string;
} {
  return readableTeamFill(getTeamColor(team));
}

const TEAM_DISPLAY_NAMES: Record<string, string> = {
  'Red Bull Racing': 'Red Bull',
};

/** User-facing team label. Colour lookups still use the full name. */
export function displayTeamName(team: string | null | undefined): string {
  if (team == null || team === '') {
    return '';
  }
  return TEAM_DISPLAY_NAMES[team] ?? team;
}
