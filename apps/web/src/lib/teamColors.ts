// F1 2026 team colours. Authored in packages/shared/src/tokens.ts alongside the
// rest of the design tokens and re-exported here, so the ~10 existing import
// sites (components, routes and the server-side OG renderers) keep working and
// mobile stops carrying a second hand-maintained copy.
//
// Still a plain module with no React in it, so server code can use it.
import {
  colors,
  fallbackTeamColor,
  teams,
} from '@grandprixpicks/shared/tokens';

export const TEAM_COLORS: Record<string, string> = teams;

export const FALLBACK_TEAM_COLOR = fallbackTeamColor;

/** A team's colour, or the fallback for a team not on the grid. */
export function teamColor(team: string | null | undefined): string {
  return (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
}

function relativeLuminance(hex: string) {
  const value = hex.replace('#', '');
  function channel(offset: number) {
    const c = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * Text colour for a team-colour fill: whichever of the page's near-black and
 * near-white reads better on it. Williams blue takes white; Mercedes teal,
 * McLaren papaya and Haas grey take near-black.
 */
export function inkForFill(fill: string): string {
  return contrast(fill, colors.textOnAccent) >= contrast(fill, colors.text)
    ? colors.textOnAccent
    : colors.text;
}

function darken(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  function channel(offset: number) {
    return Math.round(
      Number.parseInt(value.slice(offset, offset + 2), 16) * (1 - amount),
    )
      .toString(16)
      .padStart(2, '0');
  }
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** AA for the small text these fills carry. */
const MIN_FILL_CONTRAST = 4.5;

/**
 * A team colour as a fill, with the ink that reads on it.
 *
 * Most liveries clear 4.5:1 against one of the two inks as they are. Ferrari
 * and Audi red clear neither (about 4.2 and 3.9), so a fill that falls short
 * is darkened in 4% steps until near-white reads on it: still unmistakably
 * the team, and still legible.
 */
export function readableTeamFill(color: string): { fill: string; ink: string } {
  let fill = color;
  for (let step = 0; step <= 12; step += 1) {
    const ink = inkForFill(fill);
    if (contrast(fill, ink) >= MIN_FILL_CONTRAST) {
      return { fill, ink };
    }
    fill = darken(color, (step + 1) * 0.04);
  }
  return { fill, ink: colors.text };
}

/**
 * Inline style for `.gpp-team-fill`: a driver the player has picked wears
 * their team's colour as the block's fill (see
 * `docs/design-display-register.md`, "Picked drivers").
 */
export function teamFillStyle(team: string | null | undefined) {
  const { fill, ink } = readableTeamFill(teamColor(team));
  return { '--team-fill': fill, '--team-ink': ink };
}
