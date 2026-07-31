/**
 * Generates apps/web/src/tokens.generated.css from the shared token definitions.
 * Run via: pnpm --filter @grandprixpicks/shared generate-tokens
 * Called automatically before web dev/build.
 *
 * Emits, in order:
 *   1. the raw custom properties, for hand-written CSS using var(--page)
 *   2. `-rgb` channel triples, so any token can be tinted at any alpha
 *   3. the named alpha tints the design system calls for by name
 *   4. an `@theme inline` mapping so Tailwind exposes bg-page, text-muted, etc.
 *   5. an `@theme` block for radius, spacing, type, font, elevation
 *   6. a plain `:root` block for the families Tailwind has no slot for —
 *      data type scale, weights, tracking, density, layout, motion, motif
 *
 * Blocks 4 and 5 are the part a redesign leans on hardest: Tailwind compiles
 * `p-4` to `calc(var(--spacing) * 4)` and `text-sm` to `var(--text-sm)`, so
 * owning those variables turns ~3,200 utilities already written across the app
 * into consumers of this file. Retuning density or the type scale is an edit in
 * tokens.ts, not a pass over 147 components.
 *
 * Because the Tailwind mapping is generated too, adding a token to tokens.ts is
 * all that is needed — there is no second list to keep in sync.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  colors,
  dataScale,
  density,
  elevation,
  fallbackTeamColor,
  fonts,
  layout,
  lineHeights,
  motif,
  motion,
  radii,
  spacingBase,
  teams,
  tracking,
  typeScale,
  weights,
} from '../src/tokens.ts';

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
 * `#d4ff3f` → `212 255 63`, so stylesheets can tint any token at any alpha with
 * `rgb(var(--accent-rgb) / 0.12)` without hardcoding the channels. Deliberately
 * not color-mix(): lightningcss emits an alpha-stripped fallback rule for that,
 * which would paint the tint fully opaque on browsers that miss the feature.
 */
function toRgbChannels(hex: string): string {
  const int = Number.parseInt(hex.slice(1), 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

/**
 * The tints the design direction names explicitly, so components reference a
 * token rather than re-deriving an alpha. Alpha is used ONLY for these: the
 * four result tints, the accent tint and hairline, and the focus ring. There is
 * no other transparency in the system and no backdrop-filter anywhere.
 */
const ALPHA_TINTS: ReadonlyArray<
  [name: string, source: string, alpha: number]
> = [
  ['accent-quiet', 'accent', 0.12],
  ['accent-hairline', 'accent', 0.35],
  ['focus-ring', 'accent', 0.55],
  ['result-exact-quiet', 'result-exact', 0.14],
  ['result-near-quiet', 'result-near', 0.14],
  ['result-top5-quiet', 'result-top5', 0.14],
  ['result-miss-quiet', 'result-miss', 0.16],
  // Status tints. Aliases of the result semantics rather than new hues — the
  // amber is the same amber, so an error surface cannot drift toward red.
  ['error-quiet', 'error', 0.14],
  ['warning-quiet', 'warning', 0.14],
  ['success-quiet', 'success', 0.14],
];

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

lines.push('');
for (const [name, source, alpha] of ALPHA_TINTS) {
  lines.push(`  --${name}: rgb(var(--${source}-rgb) / ${alpha});`);
}

lines.push('}', '');

// Expose the tokens to Tailwind so we get bg-page, text-muted, border-accent…
lines.push('@theme inline {');
for (const name of colorVars) {
  lines.push(`  --color-${name}: var(--${name});`);
}
for (const [name] of ALPHA_TINTS) {
  lines.push(`  --color-${name}: var(--${name});`);
}
lines.push('}', '');

lines.push('@theme {');
for (const [key, value] of Object.entries(radii)) {
  lines.push(`  --radius-${key}: ${toCssLength(value)};`);
}

lines.push('');
lines.push(`  --spacing: ${spacingBase / 16}rem;`);

lines.push('');
for (const [key, { size, lineHeight }] of Object.entries(typeScale)) {
  const sizeRem = size / 16;
  lines.push(`  --text-${key}: ${sizeRem}rem;`);
  // Tailwind expects a unitless ratio here so the leading tracks the font size.
  lines.push(
    `  --text-${key}--line-height: ${
      lineHeight === null ? '1' : `calc(${lineHeight / 16} / ${sizeRem})`
    };`,
  );
}

// font-ui / font-data, so `font-data` is a Tailwind utility like any other.
lines.push('');
for (const [key, value] of Object.entries(fonts)) {
  lines.push(`  --font-${key}: ${value};`);
}

// Mapped to `none`: this system has no shadows. Kept so existing shadow-*
// utilities compile to nothing rather than falling back to Tailwind's stock
// scale. See the note on `elevation` in tokens.ts.
lines.push('');
for (const [key, value] of Object.entries(elevation)) {
  lines.push(`  --shadow-${key}: ${value};`);
}

/*
 * These must live in `@theme`, not in a plain rule, because `--tracking-*`,
 * `--leading-*` and `--ease-*` are Tailwind namespaces: registering them here
 * is what makes `tracking-label`, `leading-snug` and `ease-out` exist as
 * utilities at all. Emitted into a plain `:root` they would resolve for
 * hand-written `var()` calls but silently produce no class, which is exactly
 * how `tracking-label` came out as `letter-spacing: normal` first time round.
 */
lines.push('');
for (const [key, value] of Object.entries(tracking)) {
  lines.push(`  --tracking-${key}: ${value};`);
}

lines.push('');
for (const [key, value] of Object.entries(lineHeights)) {
  lines.push(`  --leading-${key}: ${value};`);
}

lines.push('');
lines.push(`  --ease-out: ${motion.easeOut};`);

lines.push('}', '');

/**
 * Families Tailwind has no first-class slot for. Hand-written CSS and inline
 * styles read these directly: var(--data-md), var(--fw-light), var(--nav-height).
 */
lines.push('.dark,', "[data-theme='dark'] {");

for (const [key, value] of Object.entries(dataScale)) {
  lines.push(`  --data-${key}: ${value / 16}rem;`);
}

lines.push('');
for (const [key, value] of Object.entries(weights)) {
  lines.push(`  --fw-${key}: ${value};`);
}

// `--lh-*` is an alias of the `--leading-*` set emitted into `@theme` above:
// hand-written CSS in styles.css reads `var(--lh-body)`, while Tailwind needs
// the `--leading-*` spelling to generate `leading-body`. Tracking is NOT
// repeated here — `@theme` already puts `--tracking-*` on :root.
lines.push('');
for (const [key, value] of Object.entries(lineHeights)) {
  lines.push(`  --lh-${key}: ${value};`);
}

lines.push('');
for (const [key, value] of Object.entries(density)) {
  lines.push(`  --${toKebab(key)}: ${value}px;`);
}

lines.push('');
for (const [key, value] of Object.entries(layout)) {
  lines.push(`  --${toKebab(key)}: ${value}px;`);
}

lines.push('');
for (const [key, value] of Object.entries(motion)) {
  lines.push(`  --${toKebab(key)}: ${value};`);
}
lines.push('  --transition: all var(--dur) var(--ease-out);');

/*
 * Team colours as `--team-<slug>`, matching the Claude Design spec's
 * `tokens/teams.css`. Components read them through the inline `--team-colour`
 * custom property rather than by name, but emitting them keeps the spec and
 * the app directly comparable — `check-spec-drift.mjs` diffs these.
 */
lines.push('');
for (const [name, value] of Object.entries(teams)) {
  lines.push(`  --team-${name.toLowerCase().replace(/\s+/g, '')}: ${value};`);
}
lines.push(`  --team-fallback: ${fallbackTeamColor};`);

lines.push('');
for (const [key, value] of Object.entries(motif)) {
  const cssValue = typeof value === 'number' ? `${value}px` : value;
  lines.push(`  --${toKebab(key)}: ${cssValue};`);
}
lines.push('  --hairline: 1px solid var(--border);');
lines.push('  --hairline-strong: 1px solid var(--border-strong);');

lines.push('}', '');

// prefers-reduced-motion collapses every duration to 1ms. Authored here rather
// than in styles.css so the durations and their override stay in one place.
lines.push('@media (prefers-reduced-motion: reduce) {');
lines.push('  .dark,');
lines.push("  [data-theme='dark'] {");
lines.push('    --dur-fast: 1ms;');
lines.push('    --dur: 1ms;');
lines.push('    --dur-slow: 1ms;');
lines.push('    --stagger-step: 0ms;');
lines.push('  }');
lines.push('}', '');

const outPath = resolve(
  __dirname,
  '../../../apps/web/src/tokens.generated.css',
);
writeFileSync(outPath, lines.join('\n'));
console.log(`✓ Generated ${outPath}`);

/* ────────── apps/mobile/src/global.css ──────────
 *
 * Mobile used to hand-author its whole palette in this file, which meant that
 * when the web app was reskinned, mobile silently stayed on the old slate and
 * teal: `theme/tokens.ts` re-exported the shared colours correctly, but every
 * Tailwind utility resolved against the local `@theme` block instead, and the
 * stylesheet won. The rule that tokens are authored in exactly one place now
 * covers both apps.
 *
 * This emits a much smaller file than the web one on purpose. react-native-css
 * supports a subset of the CSS the web build takes, so only the two families
 * mobile actually consumed — colours and radii — are generated, and the
 * platform font blocks below are carried through verbatim.
 */
const mobileLines: string[] = [
  '/* AUTO-GENERATED — do not edit directly.',
  ' * Source: packages/shared/src/tokens.ts',
  ' * Regenerate: pnpm --filter @grandprixpicks/shared generate-tokens',
  ' */',
  "@import 'tailwindcss/theme.css' layer(theme);",
  "@import 'tailwindcss/preflight.css' layer(base);",
  "@import 'tailwindcss/utilities.css';",
  '',
  '@layer theme {',
  '  @theme {',
];

for (const [key, value] of Object.entries(colors)) {
  mobileLines.push(`    --color-${toKebab(key)}: ${value};`);
}

/*
 * Two compatibility aliases. Mobile's ~200 `text-foreground` and `text-muted`
 * usages predate the shared names (`text` / `textMuted`), and renaming them is
 * a mechanical churn with real risk and no visual payoff. They resolve to the
 * same values, so the palette is still single-sourced.
 */
mobileLines.push('');
mobileLines.push(`    --color-foreground: ${colors.text};`);
mobileLines.push(`    --color-muted: ${colors.textMuted};`);

mobileLines.push('');
for (const [key, value] of Object.entries(radii)) {
  mobileLines.push(`    --radius-${key}: ${value}px;`);
}

mobileLines.push(
  '  }',
  '}',
  '',
  '@media android {',
  '  :root {',
  '    --font-mono: monospace;',
  '    --font-rounded: normal;',
  '    --font-serif: serif;',
  '    --font-sans: normal;',
  '  }',
  '}',
  '',
  '@media ios {',
  '  :root {',
  '    --font-mono: ui-monospace;',
  '    --font-rounded: ui-rounded;',
  '    --font-serif: ui-serif;',
  '    --font-sans: system-ui;',
  '  }',
  '}',
  '',
);

const mobileOutPath = resolve(__dirname, '../../../apps/mobile/src/global.css');
writeFileSync(mobileOutPath, mobileLines.join('\n'));
console.log(`✓ Generated ${mobileOutPath}`);
