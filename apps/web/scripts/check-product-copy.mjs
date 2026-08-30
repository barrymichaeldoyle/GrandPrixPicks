import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '../../..');
const defaultTargets = ['apps/web/src'];
const requestedTargets = process.argv.slice(2);
const targets = (
  requestedTargets.length > 0 ? requestedTargets : defaultTargets
).map((target) => path.resolve(projectRoot, target));

const ignoredPathPatterns = [
  /\/admin\//,
  /\/storybook\//,
  /\.(?:test|spec|stories)\.[cm]?[jt]sx?$/,
  /\/routeTree\.gen\.ts$/,
  /\/routes\/(?:terms|privacy|refund-policy|results-policy)\.tsx$/,
  /\/routes\/f1-(?:2026|2027)-/,
  /\/lib\/(?:circuitGuides|guideMeta|guides)\.ts$/,
];

const ignoredAttributeNames = new Set([
  'className=',
  'href=',
  'import ',
  'from ',
  'to=',
]);

const rules = [
  {
    id: 'contrast-formula',
    pattern: /\bnot (?:just|only|where)\b|\bit(?:'|’)s not\b|,[ \t]+not\b/i,
    message:
      'Prefer a direct statement unless the contrast changes the meaning.',
  },
  {
    id: 'generic-framing',
    pattern:
      /\b[Ww]hether you(?:'re| are)\b|\b[Ee]verything you need(?: to)?\b|\bFrom\s+.{2,40}\s+to\s+.{2,40}/,
    message: 'Remove generic framing and lead with the useful fact.',
  },
  {
    id: 'inflated-language',
    pattern:
      /\b(?:elevate|elevates|elevating|effortless|effortlessly|seamless|seamlessly|unlock|unlocks|unlocked|unlocking)\b/i,
    message: 'Use a plain description of the outcome.',
  },
  {
    id: 'vague-link',
    pattern: /^(?:click here|learn more|read more)$/i,
    message: 'Name the destination or action.',
  },
  {
    id: 'verbose-how-link',
    pattern: /\bhow each .{2,50} (?:is|are)\b/i,
    message: 'Prefer a shorter destination label such as “How scoring works.”',
  },
  {
    id: 'slogan-formula',
    pattern: /\bReady to .{2,70}\?|\bOne .{2,40}\.\s+Every .{2,40}\./,
    message:
      'State the action or product fact directly instead of using a slogan formula.',
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

const warnings = [];

for (const target of targets) {
  const files = await collectFiles(target);
  for (const file of files) {
    if (ignoredPathPatterns.some((pattern) => pattern.test(file))) continue;

    const sourceText = await readFile(file, 'utf8');
    const lines = sourceText.split('\n');
    let insideBlockComment = false;

    lines.forEach((lineText, lineIndex) => {
      const trimmed = lineText.trim();
      const startsBlockComment = trimmed.includes('/*');
      const isComment =
        insideBlockComment ||
        startsBlockComment ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('//');
      if (startsBlockComment && !trimmed.includes('*/'))
        insideBlockComment = true;
      if (trimmed.includes('*/')) insideBlockComment = false;

      const copyCandidate = lineText.replace(/\/\/.*$/, '');
      const ignored =
        isComment ||
        trimmed.length === 0 ||
        trimmed.includes('aria-label=') ||
        trimmed.includes('copy-audit-ignore') ||
        lines[lineIndex - 1]?.includes('copy-audit-ignore') ||
        [...ignoredAttributeNames].some((token) => trimmed.startsWith(token));
      if (ignored) return;

      for (const rule of rules) {
        if (rule.pattern.test(copyCandidate)) {
          warnings.push({
            file,
            line: lineIndex + 1,
            copy: copyCandidate
              .trim()
              .replace(/[<>{}'"`]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
            ...rule,
          });
        }
      }
    });
  }
}

if (warnings.length === 0) {
  console.log('Copy audit: no warnings.');
  process.exit(0);
}

console.log(
  `Copy audit: ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`,
);
for (const warning of warnings) {
  const relativePath = path.relative(projectRoot, warning.file);
  const excerpt = warning.copy.replace(/\s+/g, ' ').slice(0, 140);
  console.log(`\n${relativePath}:${warning.line} [${warning.id}]`);
  console.log(`  ${excerpt}${warning.copy.length > 140 ? '…' : ''}`);
  console.log(`  ${warning.message}`);
}

console.log(
  '\nWarnings are editorial prompts; this command intentionally exits 0.',
);
