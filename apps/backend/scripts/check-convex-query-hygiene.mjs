import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const backendRoot = path.resolve(import.meta.dirname, '..');
const convexRoot = path.join(backendRoot, 'convex');
const baselinePath = path.join(
  backendRoot,
  'scripts',
  'convex-query-hygiene-baseline.json',
);
const FUNCTION_START_RE =
  /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(query|mutation|internalQuery|internalMutation|action|internalAction)\s*\(\s*\{/g;
const COLLECT_RE = /\.\s*collect\s*\(/g;
const DB_FILTER_RE = /\.\s*filter\s*\(\s*\(\s*q\s*\)\s*=>/g;
const IGNORE_MARKERS = {
  unboundedCollect: 'query-hygiene-ignore unbounded-collect',
  dbFilter: 'query-hygiene-ignore db-filter',
};

async function getSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '_generated') {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getSourceFiles(absolutePath)));
      continue;
    }

    if (
      entry.isFile() &&
      absolutePath.endsWith('.ts') &&
      !absolutePath.endsWith('.test.ts')
    ) {
      files.push(absolutePath);
    }
  }

  return files;
}

function findBlockEnd(source, startIndex) {
  let depth = 0;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function collectViolations(relativePath, source) {
  const violations = {
    unboundedCollect: [],
    dbFilter: [],
  };

  for (const match of source.matchAll(FUNCTION_START_RE)) {
    const functionName = match[1];
    const functionKind = match[2];
    const objectStart = source.indexOf('{', match.index);
    const objectEnd = findBlockEnd(source, objectStart);
    if (objectEnd === -1) {
      continue;
    }

    const block = source.slice(objectStart, objectEnd + 1);
    if (
      functionKind === 'query' &&
      !block.includes(IGNORE_MARKERS.unboundedCollect)
    ) {
      for (const collectMatch of block.matchAll(COLLECT_RE)) {
        const collectIndex = objectStart + collectMatch.index;
        violations.unboundedCollect.push({
          file: relativePath,
          line: getLineNumber(source, collectIndex),
          functionName,
        });
      }
    }

    if (!block.includes(IGNORE_MARKERS.dbFilter)) {
      for (const filterMatch of block.matchAll(DB_FILTER_RE)) {
        const filterIndex = objectStart + filterMatch.index;
        violations.dbFilter.push({
          file: relativePath,
          line: getLineNumber(source, filterIndex),
          functionName,
        });
      }
    }
  }

  return violations;
}

function buildViolationSummary(violations) {
  const summary = new Map();

  for (const violation of violations) {
    const key = `${violation.file}::${violation.functionName}`;
    const existing = summary.get(key) ?? {
      file: violation.file,
      functionName: violation.functionName,
      count: 0,
      lines: [],
    };
    existing.count += 1;
    existing.lines.push(violation.line);
    summary.set(key, existing);
  }

  return summary;
}

function compareAgainstBaseline(summary, allowed) {
  const regressions = [];

  for (const entry of allowed) {
    const key = `${entry.file}::${entry.functionName}`;
    const actual = summary.get(key);
    if (!actual) {
      continue;
    }
    if (actual.count > entry.count) {
      regressions.push({
        file: actual.file,
        functionName: actual.functionName,
        count: actual.count,
        allowedCount: entry.count,
        lines: actual.lines,
      });
    }
    summary.delete(key);
  }

  const newViolations = [...summary.values()].map((entry) => ({
    file: entry.file,
    functionName: entry.functionName,
    count: entry.count,
    allowedCount: 0,
    lines: entry.lines,
  }));

  return { regressions, newViolations };
}

function printViolations(prefix, violations) {
  for (const violation of violations) {
    console.error(
      `- ${prefix}: ${violation.file} (${violation.functionName}) ${violation.allowedCount} -> ${violation.count} at lines ${violation.lines.join(', ')}`,
    );
  }
}

function printNewViolations(violations) {
  for (const violation of violations) {
    console.error(
      `- new: ${violation.file} (${violation.functionName}) count ${violation.count} at lines ${violation.lines.join(', ')}`,
    );
  }
}

const files = await getSourceFiles(convexRoot);
const unboundedCollectViolations = [];
const dbFilterViolations = [];

for (const absolutePath of files) {
  const source = await readFile(absolutePath, 'utf8');
  const relativePath = path.relative(backendRoot, absolutePath);
  const violations = collectViolations(relativePath, source);
  unboundedCollectViolations.push(...violations.unboundedCollect);
  dbFilterViolations.push(...violations.dbFilter);
}

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const unboundedCollectSummary = buildViolationSummary(unboundedCollectViolations);
const dbFilterSummary = buildViolationSummary(dbFilterViolations);
const unboundedCollectResult = compareAgainstBaseline(
  unboundedCollectSummary,
  baseline.unboundedCollect,
);
const dbFilterResult = compareAgainstBaseline(
  dbFilterSummary,
  baseline.dbFilter,
);

if (
  unboundedCollectResult.regressions.length === 0 &&
  unboundedCollectResult.newViolations.length === 0 &&
  dbFilterResult.regressions.length === 0 &&
  dbFilterResult.newViolations.length === 0
) {
  process.exit(0);
}

if (
  unboundedCollectResult.regressions.length > 0 ||
  unboundedCollectResult.newViolations.length > 0
) {
  console.error(
    'Unbounded `.collect()` regressed inside public Convex `query()` handlers.',
  );
  console.error(
    'Use `.take()`, pagination, denormalized data, or add a one-off ignore with:',
  );
  console.error(`// ${IGNORE_MARKERS.unboundedCollect}`);
  printViolations('increased', unboundedCollectResult.regressions);
  printNewViolations(unboundedCollectResult.newViolations);
}

if (
  dbFilterResult.regressions.length > 0 ||
  dbFilterResult.newViolations.length > 0
) {
  console.error('Database `.filter((q) => ...)` regressed in Convex functions.');
  console.error('Prefer an index and `withIndex(...)`, or add a one-off ignore with:');
  console.error(`// ${IGNORE_MARKERS.dbFilter}`);
  printViolations('increased', dbFilterResult.regressions);
  printNewViolations(dbFilterResult.newViolations);
}

process.exit(1);
