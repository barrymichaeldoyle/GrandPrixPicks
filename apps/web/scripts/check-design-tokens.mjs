import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

/**
 * Stops the design system from leaking.
 *
 * Three rules, each a ratchet with its own per-file baseline. A baseline number
 * can only ever be edited DOWNWARDS: cleaning a file up also fails the check,
 * telling you to lower it. That way a knowingly-accepted violation can be
 * recorded with a reason, but the total can never grow.
 *
 *   palette    — colour comes from the design tokens
 *                (packages/shared/src/tokens.ts -> bg-page, text-accent, ...),
 *                never from Tailwind's stock palette. Two separate palettes is
 *                how the app ended up shipping share cards in colours it had
 *                abandoned, and how a `destructive` class name that matched no
 *                token sat unnoticed on the cancelled-race badge, silently
 *                rendering nothing.
 *
 *   elevation  — there are NO shadows in Timing Sheet Minimal. Depth is a
 *                lighter surface plus a 1px hairline. The shadow-* scale is
 *                mapped to `none` in tokens.ts so stray utilities are inert,
 *                but they still read as intent to a future editor, so they are
 *                caught here rather than left to rot.
 *
 *   flat       — backgrounds are flat colour. No gradients, no textures, no
 *                noise, no glow. This is the rule most likely to be broken by
 *                someone reaching for "just a subtle gradient", which is
 *                precisely how the previous design accumulated an atmosphere
 *                field, a grain overlay and three separate grid backgrounds.
 *
 * Admin is deliberately out of scope. It is internal tooling with its own
 * visual language; holding it to the player-facing palette would be busywork.
 */

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(appRoot, 'src');

const EXEMPT = [/^src\/components\/admin\//, /^src\/routes\/admin\//];

/**
 * Each rule: a matcher, the message shown on regression, and the accepted
 * per-file counts. Only ever edit a baseline number downwards.
 */
const RULES = [
  {
    name: 'palette',
    pattern:
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|shadow|outline|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d+)?\b/g,
    explain: [
      'Off-token colours found. Use a design token (bg-surface, text-accent,',
      'border-error, ...) instead of Tailwind’s stock palette. See',
      'packages/shared/src/tokens.ts for the full set.',
    ],
    baseline: new Map([]),
  },
  {
    name: 'elevation',
    // shadow-* utilities and raw box-shadow in inline styles.
    pattern:
      /\bshadow-(?:sm|md|lg|xl|2xl|inner|\[)|\bboxShadow\b|\bbox-shadow\b/g,
    explain: [
      'Shadows found. This system has no elevation shadows: depth is a lighter',
      'surface (bg-surface -> bg-surface-elevated) plus a 1px hairline',
      '(border border-border). Empty containers use a dashed hairline.',
    ],
    baseline: new Map([]),
  },
  {
    name: 'flat',
    // Tailwind gradient utilities and raw CSS gradient / filter functions.
    pattern:
      /\bbg-gradient-to-[a-z]+\b|\bbg-\[(?:linear|radial|conic)-gradient|\b(?:linear|radial|conic)-gradient\(|\bbackdrop-blur\b|\bmix-blend-\w+\b/g,
    explain: [
      'Gradient, blur or blend found. Backgrounds are flat colour only —',
      'no gradients, textures, noise, glow or backdrop-filter. If you need',
      'a tint, use an alpha token (bg-accent-quiet, bg-result-beat-quiet).',
    ],
    baseline: new Map([]),
  },
];

async function findTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findTsxFiles(absolutePath)));
      continue;
    }

    if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.stories.tsx')) {
      files.push(
        path.relative(appRoot, absolutePath).split(path.sep).join('/'),
      );
    }
  }

  return files;
}

const files = (await findTsxFiles(sourceRoot))
  .filter((file) => !EXEMPT.some((pattern) => pattern.test(file)))
  .sort();

const sources = new Map();
for (const file of files) {
  sources.set(file, await readFile(path.join(appRoot, file), 'utf8'));
}

let failed = false;

for (const rule of RULES) {
  const regressions = [];
  const improvements = [];

  for (const file of files) {
    const matches = sources.get(file).match(rule.pattern) ?? [];
    const allowed = rule.baseline.get(file) ?? 0;

    if (matches.length > allowed) {
      regressions.push({
        file,
        allowed,
        found: matches.length,
        sample: [...new Set(matches)].slice(0, 5),
      });
    } else if (matches.length < allowed) {
      improvements.push({ file, allowed, found: matches.length });
    }
  }

  if (improvements.length > 0) {
    failed = true;
    console.error(
      `[${rule.name}] baseline is out of date (this is good news).`,
    );
    console.error('Lower these numbers in scripts/check-design-tokens.mjs:');
    for (const { file, allowed, found } of improvements) {
      console.error(`- ${file}: ${allowed} -> ${found}`);
    }
    console.error('');
  }

  if (regressions.length > 0) {
    failed = true;
    for (const line of rule.explain) {
      console.error(`[${rule.name}] ${line}`);
    }
    console.error('');
    for (const { file, allowed, found, sample } of regressions) {
      console.error(
        `- ${file}: ${found} found, ${allowed} allowed (${sample.join(', ')})`,
      );
    }
    console.error('');
  }
}

process.exit(failed ? 1 : 0);
