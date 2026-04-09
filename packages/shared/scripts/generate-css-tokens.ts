/**
 * Generates apps/web/src/tokens.generated.css from the shared token definitions.
 * Run via: pnpm --filter @grandprixpicks/shared generate-tokens
 * Called automatically before web dev/build.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors } from '../src/tokens.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// camelCase → kebab-case
function toKebab(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// Map token keys to their CSS var names (override where naming diverges)
const CSS_VAR_OVERRIDES: Partial<Record<keyof typeof colors, string>> = {
  surfaceElevated: 'surface-elevated',
  surfaceMuted: 'surface-muted',
  buttonAccent: 'button-accent',
  buttonAccentHover: 'button-accent-hover',
  textMuted: 'text-muted',
  borderStrong: 'border-strong',
  accentHover: 'accent-hover',
  accentMuted: 'accent-muted',
  successMuted: 'success-muted',
  warningMuted: 'warning-muted',
};

const lines: string[] = [
  '/* AUTO-GENERATED — do not edit directly.',
  ' * Source: packages/shared/src/tokens.ts',
  ' * Regenerate: pnpm generate-tokens',
  ' */',
  '',
  '.dark,',
  "[data-theme='dark'] {",
];

for (const [key, value] of Object.entries(colors) as [keyof typeof colors, string][]) {
  const varName = CSS_VAR_OVERRIDES[key] ?? toKebab(key);
  lines.push(`  --${varName}: ${value};`);
}

lines.push('}', '');

const outPath = resolve(__dirname, '../../../apps/web/src/tokens.generated.css');
writeFileSync(outPath, lines.join('\n'));
console.log(`✓ Generated ${outPath}`);
