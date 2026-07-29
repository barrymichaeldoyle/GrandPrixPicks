// F1 2026 team colours, re-exported from the shared design tokens.
//
// This used to be a hand-maintained copy of the web list with a comment saying
// it mirrored DriverBadge.tsx. The two still agreed, but nothing was keeping
// them that way — the same setup that let the OG share cards drift into a
// palette the product had abandoned.
import { fallbackTeamColor, teams } from '@grandprixpicks/shared/tokens';

export function getTeamColor(team?: string | null): string {
  return (team && teams[team as keyof typeof teams]) || fallbackTeamColor;
}
