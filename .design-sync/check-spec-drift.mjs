import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

/**
 * Compares the Claude Design spec against what the app actually renders.
 *
 * `spec/tokens/*.css` is a byte snapshot of the `tokens/` directory in the
 * Claude Design project "Grand Prix Picks Design System"
 * (207819bf-d2c7-45dc-945c-24ccdb151049). That project is the CREATIVE SOURCE:
 * it is hand-authored there and flows one way, Design -> repo.
 *
 * `apps/web/src/tokens.generated.css` is what the app renders, generated from
 * `packages/shared/src/tokens.ts`.
 *
 * This script diffs the two so "are we in sync with Claude Design?" is a
 * command rather than a judgement call.
 *
 *   node .design-sync/check-spec-drift.mjs
 *
 * WORKFLOW when the Design side changes:
 *   1. Ask Claude to re-pull the snapshot (one DesignSync `get_file` per token
 *      file, written into spec/tokens/). The script cannot do this itself —
 *      DesignSync is an agent tool authenticated through the claude.ai login,
 *      not a CLI.
 *   2. Run this script. It reports exactly which values moved.
 *   3. Port the changes into packages/shared/src/tokens.ts and regenerate.
 *
 * Exit code is 0 when the only differences are in DIVERGENCES below. This is a
 * report, not a gate — it is deliberately NOT wired into `pnpm lint`, because
 * the spec is a design document that moves independently of a release.
 */

const root = path.resolve(import.meta.dirname, '..');
const specDir = path.join(root, '.design-sync/spec/tokens');
const generated = path.join(root, 'apps/web/src/tokens.generated.css');

/**
 * The spec names a token one way, the repo another. These are pure renames
 * with no visual consequence: the repo's names predate this design system and
 * are load-bearing across ~3,200 Tailwind utilities and the mobile app.
 */
const ALIASES = new Map([
  ['background', 'page'],
  ['surface-raised', 'surface-elevated'],
  ['radius-input', 'radius-sm'],
  ['radius-card', 'radius-lg'],

  /*
   * The type scale, spec role-name -> Tailwind name. The px values are
   * identical; only the spelling differs, because ~850 existing utilities
   * depend on the Tailwind names. Aliased rather than excused as a divergence
   * so the equivalence is actually *verified* on every run — if someone
   * retunes text-base to 16px, this catches it.
   */
  ['text-micro', 'text-xs'],
  ['text-small', 'text-sm'],
  ['text-body', 'text-base'],
  ['text-h3', 'text-lg'],
  ['text-h2', 'text-xl'],
  ['text-h1', 'text-3xl'],
  ['text-display', 'text-5xl'],
]);

/**
 * Deliberate departures from the spec, each with the reason it was taken.
 *
 * This list is the point of the whole script: without it, every re-sync
 * re-litigates the same decisions. If you change your mind on one, delete the
 * entry and port the spec value.
 */
const DIVERGENCES = [];

/*
 * Resolved 2026-07-29 by feeding the app's reality back into the spec, rather
 * than carrying them as permanent exceptions:
 *
 *   team-*     the spec shipped 2025 sample teams; it now carries the real
 *              2026 grid, and the app emits --team-* from the shared tokens
 *              so the two are directly comparable.
 *   stripe     the spec's transform: skewX(-12deg) is genuinely broken on tall
 *              containers; it now specifies the clip-path and --stripe-lean.
 *   podium-*   the spec had no podium colours; it now defines them as flat
 *              data colours with the "never a medal" rule.
 *   sprint     the spec had no sprint concept; it now aliases the violet.
 *   error/warning/success  the spec stated "errors are amber" in prose only;
 *              they are tokens now, so a status surface cannot reach for red.
 */

function parseVars(css) {
  const out = new Map();
  // Last declaration wins, matching the cascade.
  for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
    out.set(m[1].toLowerCase(), m[2].trim().toLowerCase().replace(/\s+/g, ' '));
  }
  return out;
}

/**
 * Tokens the spec declares for its own internal use, which the repo has no
 * reason to mirror. Not divergences — just not part of the contract.
 */
const NOT_PART_OF_CONTRACT = [
  // The spec's raw palette aliases, superseded by the semantic names that
  // reference them (--accent, --background, ...).
  /^gpp-/,
  // Tailwind derives its whole spacing scale from the `--spacing` base
  // multiplier, so a literal --space-N ladder would be dead weight. The base
  // unit (4px) is checked via `spacingBase`.
  /^space-\d+$/,
  // Used inline as a literal `1px`; never referenced as a variable.
  /^border-width$/,
];

function hexToChannels(hex) {
  const int = Number.parseInt(hex, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

/**
 * Collapses the representations that differ on paper but paint identically.
 *
 * The big one is alpha: the spec hardcodes `rgba(212,255,63,0.12)` while the
 * generator emits `rgb(var(--accent-rgb) / 0.12)` so a tint tracks its source
 * colour. Same pixels, and the indirection is the point — resolve it before
 * comparing rather than reporting seven false positives every run.
 */
function normalise(value, app) {
  let v = value.trim().toLowerCase();

  // rgb(var(--accent-rgb) / 0.12)  ->  212 255 63 / 0.12
  const viaVar =
    /^rgba?\(\s*var\(--([a-z0-9-]+)-rgb\)\s*\/\s*([\d.]+)\s*\)$/.exec(v);
  if (viaVar) {
    const source = app.get(`${viaVar[1]}-rgb`);
    if (source)
      return `${source.replace(/\s+/g, ' ')} / ${Number.parseFloat(viaVar[2])}`;
  }

  // rgba(212,255,63,0.12)  ->  212 255 63 / 0.12
  const rgba =
    /^rgba?\(\s*([\d]+)\s*,\s*([\d]+)\s*,\s*([\d]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
      v,
    );
  if (rgba) {
    const alpha = rgba[4] === undefined ? 1 : Number.parseFloat(rgba[4]);
    return `${rgba[1]} ${rgba[2]} ${rgba[3]} / ${alpha}`;
  }

  const hex = /^#([0-9a-f]{6})$/.exec(v);
  if (hex) return `${hexToChannels(hex[1])} / 1`;

  const px = /^(-?[\d.]+)px$/.exec(v);
  if (px) return `${Number.parseFloat(px[1])}px`;
  const rem = /^(-?[\d.]+)rem$/.exec(v);
  if (rem) return `${Number.parseFloat(rem[1]) * 16}px`;

  // A font stack matches on its first family: the fallbacks after it are a
  // platform concern, not a design decision.
  if (v.includes(',') && /["']|sans-serif|monospace/.test(v)) {
    return v.split(',')[0].replace(/["']/g, '').trim();
  }

  // cubic-bezier(0.2,0.8,0.3,1) vs cubic-bezier(0.2, 0.8, 0.3, 1)
  return v.replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ');
}

const specFiles = (await readdir(specDir)).filter((f) => f.endsWith('.css'));
const spec = new Map();
for (const file of specFiles) {
  for (const [k, v] of parseVars(
    await readFile(path.join(specDir, file), 'utf8'),
  )) {
    spec.set(k, v);
  }
}

const app = parseVars(await readFile(generated, 'utf8'));

const divergent = new Set();
for (const { token } of DIVERGENCES) {
  const stem = token.replace(/\*.*$/, '');
  divergent.add(stem);
}
function isDivergent(name) {
  for (const stem of divergent) {
    if (name === stem || name.startsWith(stem)) return true;
  }
  return false;
}

const matched = [];
const differs = [];
const missing = [];

for (const [name, specValue] of spec) {
  if (isDivergent(name)) continue;
  if (NOT_PART_OF_CONTRACT.some((re) => re.test(name))) continue;

  const appName = ALIASES.get(name) ?? name;
  const appValue = app.get(appName);

  if (appValue === undefined) {
    missing.push({ name, appName, specValue });
    continue;
  }
  if (normalise(appValue, app) === normalise(specValue, app)) {
    matched.push(name);
  } else {
    differs.push({ name, appName, specValue, appValue });
  }
}

const pct = (
  (matched.length / (matched.length + differs.length + missing.length)) *
  100
).toFixed(0);

console.log('Claude Design spec  ->  apps/web');
console.log('  project: "Grand Prix Picks Design System"');
console.log('  snapshot: .design-sync/spec/tokens/\n');
console.log(`  ${matched.length} tokens match (${pct}%)`);
console.log(`  ${differs.length} differ`);
console.log(`  ${missing.length} in the spec but not implemented`);
console.log(`  ${DIVERGENCES.length} documented divergences (not compared)\n`);

if (differs.length > 0) {
  console.log('DIFFERS — spec value vs what the app renders:');
  for (const { name, appName, specValue, appValue } of differs) {
    const via = appName === name ? '' : ` (as --${appName})`;
    console.log(
      `  --${name}${via}\n      spec: ${specValue}\n      app:  ${appValue}`,
    );
  }
  console.log('');
}

if (missing.length > 0) {
  console.log('NOT IMPLEMENTED — in the spec, absent from the app:');
  for (const { name, specValue } of missing) {
    console.log(`  --${name}: ${specValue}`);
  }
  console.log('');
}

if (DIVERGENCES.length > 0) {
  console.log('DOCUMENTED DIVERGENCES — deliberate, with reasons:');
  for (const { token, reason } of DIVERGENCES) {
    console.log(`  ${token}\n      ${reason}`);
  }
} else if (differs.length === 0 && missing.length === 0) {
  console.log('In sync. No divergences to carry.');
}

process.exit(0);
