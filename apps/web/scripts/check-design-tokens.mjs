import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

/**
 * Stops the design system from leaking.
 *
 * Player-facing UI must colour itself from the design tokens
 * (packages/shared/src/tokens.ts -> bg-page, text-accent, border-error, ...),
 * not from Tailwind's stock palette. Two separate palettes is how the app ended
 * up shipping share cards in colours it had abandoned, and how a `destructive`
 * class name that matched no token sat unnoticed on the cancelled-race badge,
 * silently rendering nothing.
 *
 * This is a ratchet, not a ban: the files below still carry known violations
 * and are allowed to keep exactly that many. Add one and the check fails;
 * remove some and lower the number. New files must start clean.
 *
 * Admin is deliberately out of scope. It is internal tooling with its own
 * visual language and roughly half the remaining violations; holding it to the
 * player-facing palette would be busywork.
 */

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(appRoot, 'src');

const TAILWIND_PALETTE_UTILITY =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|shadow|outline|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d+)?\b/g;

const EXEMPT = [/^src\/components\/admin\//, /^src\/routes\/admin\//];

/** Known violations, by file. Only ever edit these downwards. */
const BASELINE = new Map([
  // Deliberate: metallic gradient medals. Converting them either flattens the
  // gradient or needs six light/dark podium tokens for one component.
  ['src/routes/-home/LeaderboardTeaser.tsx', 9],
]);

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

const files = await findTsxFiles(sourceRoot);
const regressions = [];
const improvements = [];

for (const relativeFile of files.sort()) {
  if (EXEMPT.some((pattern) => pattern.test(relativeFile))) {
    continue;
  }

  const source = await readFile(path.join(appRoot, relativeFile), 'utf8');
  const matches = source.match(TAILWIND_PALETTE_UTILITY) ?? [];
  const allowed = BASELINE.get(relativeFile) ?? 0;

  if (matches.length > allowed) {
    regressions.push({
      file: relativeFile,
      allowed,
      found: matches.length,
      sample: [...new Set(matches)].slice(0, 5),
    });
  } else if (matches.length < allowed) {
    improvements.push({ file: relativeFile, allowed, found: matches.length });
  }
}

if (improvements.length > 0) {
  console.error('Design token baseline is out of date (this is good news).');
  console.error('Lower these numbers in scripts/check-design-tokens.mjs:');
  for (const { file, allowed, found } of improvements) {
    console.error(`- ${file}: ${allowed} -> ${found}`);
  }
  console.error('');
}

if (regressions.length > 0) {
  console.error(
    'Off-token colours found. Use a design token (bg-surface, text-accent,',
  );
  console.error('border-error, ...) instead of Tailwind’s stock palette. See');
  console.error('packages/shared/src/tokens.ts for the full set.');
  console.error('');
  for (const { file, allowed, found, sample } of regressions) {
    console.error(
      `- ${file}: ${found} found, ${allowed} allowed (${sample.join(', ')})`,
    );
  }
}

process.exit(regressions.length > 0 || improvements.length > 0 ? 1 : 0);
