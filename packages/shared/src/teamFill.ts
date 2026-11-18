// Team-colour fills that stay legible: the contrast rule behind "a driver the
// player has picked wears their team's colour" (docs/design-display-register.md,
// "Picked drivers"). Shared so web and mobile darken the same liveries the same
// way and pick the same ink.
import { colors } from './tokens';

function relativeLuminance(hex: string) {
  const value = hex.replace('#', '');
  function channel(offset: number) {
    const c = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** WCAG contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
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
  return contrastRatio(fill, colors.textOnAccent) >=
    contrastRatio(fill, colors.text)
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
    if (contrastRatio(fill, ink) >= MIN_FILL_CONTRAST) {
      return { fill, ink };
    }
    fill = darken(color, (step + 1) * 0.04);
  }
  return { fill, ink: colors.text };
}
