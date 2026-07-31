/**
 * WCAG colour maths for the design-system Foundations panel.
 *
 * The OG card templates were the other consumer: they used `relativeLuminance`
 * to pick black-or-white ink per livery for driver badges filled with team
 * colour. Confining team colour to a 3px bar removed the need to compute
 * anything, so only the Foundations contrast table is left.
 */

/** Accepts `#rrggbb` or `rrggbb`. */
function channels(hex: string): [number, number, number] {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(raw.slice(offset, offset + 2), 16) / 255;
    // sRGB inverse companding. The threshold is 0.04045, not the 0.03928 that
    // circulates in older references.
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return [r ?? 0, g ?? 0, b ?? 0];
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

/** WCAG 2.1 contrast ratio between two opaque colours, 1:1 to 21:1. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}
