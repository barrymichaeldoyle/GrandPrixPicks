#!/usr/bin/env node
/**
 * Every rule in styles.css must sit inside an `@layer`.
 *
 * Unlayered CSS beats ALL layered CSS regardless of specificity, so an
 * unlayered `.font-title { font-weight: … }` silently outranks the
 * `font-semibold` a call site wrote beside it. That is not hypothetical: it
 * shipped, and it took a computed-style read in a browser to find, because a
 * class string that reads correctly can still be losing. Five bugs came from
 * one missing wrapper — 78 headings at the wrong weight, a hover state that
 * never painted, a modal scrim that never appeared.
 *
 * The fix is structural, so the guard is structural: nothing in this file gets
 * to outrank a utility by accident again. A rule that genuinely must win
 * belongs in the component that needs it, where it is visible to whoever is
 * reading that component.
 */
import { readFileSync } from 'node:fs';

const FILE = 'src/styles.css';
const css = readFileSync(FILE, 'utf8');

// Strip comments and string literals so braces inside them never count.
const scrubbed = css
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(['"])(?:\\.|(?!\1)[^\\\n])*\1/g, (m) => m.replace(/[^\n]/g, ' '));

/**
 * Two things at the top level are not competing with any utility, so they stay
 * where they are:
 *
 *   `@font-face`, which declares a resource rather than styling an element.
 *   Rules that set ONLY custom properties — `:root`, `[data-theme]`. A token
 *   definition is read by utilities, never overridden by one, so layering it
 *   would buy nothing and `:root` in `base` would lose to Tailwind's own.
 *
 * A rule that sets one real property alongside its variables is NOT exempt:
 * that property outranks utilities exactly like any other unlayered rule.
 */
function exempt(head, braceIndex) {
  if (head.startsWith('@font-face')) return true;
  const body = scrubbed.slice(
    braceIndex + 1,
    scrubbed.indexOf('}', braceIndex),
  );
  const declared = body
    .split(';')
    .map((d) => d.split(':')[0].trim())
    .filter(Boolean);
  return declared.length > 0 && declared.every((d) => d.startsWith('--'));
}

const offenders = [];
let depth = 0;
let layerDepth = null;
let atRule = '';

for (let i = 0; i < scrubbed.length; i++) {
  const ch = scrubbed[i];

  if (ch === '{') {
    const head = atRule.trim().replace(/\s+/g, ' ');
    if (depth === 0 && !head.startsWith('@layer') && !exempt(head, i)) {
      const line = scrubbed.slice(0, i).split('\n').length;
      offenders.push({ line, head: head.slice(0, 60) });
    }
    if (head.startsWith('@layer') && layerDepth === null) layerDepth = depth;
    depth++;
    atRule = '';
    continue;
  }

  if (ch === '}') {
    depth--;
    if (layerDepth !== null && depth <= layerDepth) layerDepth = null;
    atRule = '';
    continue;
  }

  if (ch === ';' && depth === 0) {
    atRule = ''; // @import / @custom-variant / bare @layer declaration
    continue;
  }

  atRule += ch;
}

if (offenders.length > 0) {
  console.error(`\n${FILE}: ${offenders.length} unlayered rule(s).\n`);
  for (const { line, head } of offenders) {
    console.error(`  ${FILE}:${line}  ${head} {`);
  }
  console.error(
    '\nUnlayered CSS beats every Tailwind utility no matter the specificity,\n' +
      'so a utility written beside one of these silently does nothing.\n' +
      'Wrap it in `@layer base { … }`, or move it into the component that\n' +
      'actually needs it to win.\n',
  );
  process.exit(1);
}

console.log(`${FILE}: all rules layered.`);
