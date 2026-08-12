/**
 * Convex read hooks must come from `@/integrations/convex/query`, not from
 * `convex/react` directly.
 *
 * The two are the same three functions; the difference is that the app's
 * version keeps its subscription alive for a few minutes after the last
 * reader unmounts. Import the raw one and that component's data is thrown
 * away on every route change, so leaving a page and coming back paints a
 * skeleton over data the client had a moment ago. That is invisible in
 * review — the code looks identical — which is why it is checked here.
 *
 * Mutations, actions and the auth/connection hooks still come from
 * `convex/react`; only reads are restricted.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(appRoot, 'src');

const READ_HOOKS = ['useQuery', 'usePaginatedQuery', 'useQueries'];

/** Files that legitimately reach past the wrapper. */
const allowedPatterns = [
  // Storybook aliases both modules to this one mock, so it has to define the
  // read hooks itself rather than import them from anywhere.
  /^src\/storybook\/mockConvexReact\.tsx$/,
];

const convexReactImport = /import\s*\{([^}]*)\}\s*from\s*'convex\/react'/g;

async function findSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findSourceFiles(absolutePath)));
      continue;
    }

    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(
        path.relative(appRoot, absolutePath).split(path.sep).join('/'),
      );
    }
  }

  return files;
}

const sourceFiles = await findSourceFiles(sourceRoot);
const violations = [];

for (const relativeFile of sourceFiles) {
  if (allowedPatterns.some((pattern) => pattern.test(relativeFile))) {
    continue;
  }

  const source = await readFile(path.join(appRoot, relativeFile), 'utf8');

  for (const match of source.matchAll(convexReactImport)) {
    const imported = match[1].split(',').map((name) => name.trim());
    const reads = imported.filter((name) => READ_HOOKS.includes(name));

    if (reads.length > 0) {
      violations.push(`${relativeFile} (${reads.join(', ')})`);
    }
  }
}

if (violations.length === 0) {
  process.exit(0);
}

console.error(
  "Convex read hooks must be imported from '@/integrations/convex/query', " +
    "not 'convex/react' — the direct import drops its subscription on unmount " +
    'and reloads the page on every return visit:',
);

for (const violation of violations) {
  console.error(`- ${violation}`);
}

process.exit(1);
