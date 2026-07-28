/**
 * Generates apps/web/src/tokens.generated.css from the shared token definitions.
 * Run via: pnpm --filter @grandprixpicks/shared generate-tokens
 * Called automatically before web dev/build.
 *
 * Emits three blocks:
 *   1. the raw custom properties, for hand-written CSS using var(--page)
 *   2. an `@theme inline` mapping so Tailwind exposes bg-page, text-muted, etc.
 *   3. an `@theme` radius scale, overriding Tailwind's defaults
 *
 * Because the Tailwind mapping is generated too, adding a token to tokens.ts is
 * all that is needed — there is no second list to keep in sync.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors, radii } from '../src/tokens.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// camelCase → kebab-case
function toKebab(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// Radii are authored in px for React Native; the web scale wants rem so it
// tracks the root font size. Pill stays in px — it is a "large enough" sentinel.
function toCssLength(px: number): string {
  return px >= 100 ? `${px}px` : `${px / 16}rem`;
}

/**
 * `#31b8ab` → `49 184 171`, so stylesheets can tint any token at any alpha with
 * `rgb(var(--accent-rgb) / 0.12)` without hardcoding the channels. Deliberately
 * not color-mix(): lightningcss emits an alpha-stripped fallback rule for that,
 * which would paint the tint fully opaque on browsers that miss the feature.
 */
function toRgbChannels(hex: string): string {
  const int = Number.parseInt(hex.slice(1), 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

const colorVars = Object.keys(colors).map(toKebab);

const lines: string[] = [
  '/* AUTO-GENERATED — do not edit directly.',
  ' * Source: packages/shared/src/tokens.ts',
  ' * Regenerate: pnpm --filter @grandprixpicks/shared generate-tokens',
  ' */',
  '',
  '.dark,',
  "[data-theme='dark'] {",
];

for (const [key, value] of Object.entries(colors)) {
  lines.push(`  --${toKebab(key)}: ${value};`);
}

lines.push('');

for (const [key, value] of Object.entries(colors)) {
  lines.push(`  --${toKebab(key)}-rgb: ${toRgbChannels(value)};`);
}

lines.push('}', '');

// Expose the tokens to Tailwind so we get bg-page, text-muted, border-accent…
lines.push('@theme inline {');
for (const name of colorVars) {
  lines.push(`  --color-${name}: var(--${name});`);
}
lines.push('}', '');

lines.push('@theme {');
for (const [key, value] of Object.entries(radii)) {
  lines.push(`  --radius-${key}: ${toCssLength(value)};`);
}
lines.push('}', '');

const outPath = resolve(
  __dirname,
  '../../../apps/web/src/tokens.generated.css',
);
writeFileSync(outPath, lines.join('\n'));
console.log(`✓ Generated ${outPath}`);
