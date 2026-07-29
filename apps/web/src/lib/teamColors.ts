// F1 2026 team colours. Authored in packages/shared/src/tokens.ts alongside the
// rest of the design tokens and re-exported here, so the ~10 existing import
// sites (components, routes and the server-side OG renderers) keep working and
// mobile stops carrying a second hand-maintained copy.
//
// Still a plain module with no React in it, so server code can use it.
import { fallbackTeamColor, teams } from '@grandprixpicks/shared/tokens';

export const TEAM_COLORS: Record<string, string> = teams;

export const FALLBACK_TEAM_COLOR = fallbackTeamColor;
