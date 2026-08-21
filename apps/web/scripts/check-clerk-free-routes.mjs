/**
 * A Clerk-free route must not statically reach a Clerk component.
 *
 * `isClerkFreeRoute` (src/integrations/clerk/clerk-free-routes.ts) lists the
 * routes an anonymous visitor is served without `ClerkProvider` on the page at
 * all, which saves them ~365 kB of auth runtime. The catch is that Clerk's own
 * components throw when they cannot find a provider — `SignInButton can only be
 * used within the <ClerkProvider /> component` — so a Clerk-free route that
 * renders one does not merely degrade: it takes the whole route into the error
 * boundary and shows "Something went wrong" to precisely the signed-out
 * audience the route exists to serve.
 *
 * That is what shipped on `/races/*` and `/leaderboard`: both were added to the
 * allowlist while components deep in their subtrees still mounted Clerk's
 * `SignInButton` / `useAuth`. Nothing failed in review or in tests, because the
 * two halves live in different files and only signed-out visitors hit it.
 *
 * So the allowlist is checked here instead. For each Clerk-free route this
 * walks the *static* import graph from its route file and fails if any reachable
 * module imports from `@clerk/*`. Static is the operative word: `lazy(() =>
 * import(...))` is the sanctioned way to reach Clerk (that is how
 * `AuthenticatedAppRuntime` and the sign-in overlay boot on demand, inside
 * their own provider), so dynamic imports are deliberately not followed.
 *
 * Only Clerk's *client* packages count. `@clerk/backend` is the edge-safe
 * server SDK used to resolve auth during SSR; it has no provider and no
 * components, and the cache-header helpers pull it into almost every route.
 *
 * The fix for a violation is never to delete the route from the allowlist —
 * that just makes it slow again. Use the provider-free path: `SignInPrompt`,
 * `SignInActionButton`, or `useClerkRuntimeControl().requestSignIn()` to prompt,
 * and `useViewerSession()` instead of Clerk's `useAuth`.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { isClerkFreeRoute } from '../src/integrations/clerk/clerk-free-routes.ts';

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(appRoot, 'src');
const routesRoot = path.join(sourceRoot, 'routes');

/** Server-side Clerk: no React context involved, so it is never the problem. */
const SERVER_ONLY_CLERK = new Set(['@clerk/backend']);

/** `import ... from 'x'` / `export ... from 'x'`, but never `import('x')`. */
const staticImport =
  /(?:^|\n)\s*(?:import|export)\b[^;'"\n]*?from\s*['"]([^'"]+)['"]/g;
/** A bare `import 'x'` side-effect line. */
const sideEffectImport = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

function isTestOrStory(fileName) {
  return /\.(test|spec|stories)\.[cm]?tsx?$/.test(fileName);
}

async function findFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findFiles(absolutePath)));
      continue;
    }

    if (/\.tsx?$/.test(entry.name) && !isTestOrStory(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

/**
 * The URL a route file serves, per TanStack's file-based routing: `index` is
 * the directory itself, dots in a flat file name are path separators, and a
 * leading `-` marks a folder or file that is co-located code, not a route.
 */
function routePathFor(absolutePath) {
  const relative = path
    .relative(routesRoot, absolutePath)
    .split(path.sep)
    .join('/');

  if (relative.startsWith('__root')) {
    return null;
  }

  const withoutExtension = relative.replace(/\.tsx?$/, '');
  const segments = withoutExtension.split('/').flatMap((segment, index, all) =>
    // Only the file name (the last part) uses dots as separators.
    index === all.length - 1 ? segment.split('.') : [segment],
  );

  // Anything under a `-components` / `-hooks` folder is not a route itself; it
  // is reached through the route that imports it, and checked that way.
  if (segments.some((segment) => segment.startsWith('-'))) {
    return null;
  }

  const withoutIndex =
    segments.at(-1) === 'index' ? segments.slice(0, -1) : segments;

  return `/${withoutIndex.join('/')}`.replace(/\/+$/, '') || '/';
}

const resolveCache = new Map();

async function resolveModule(specifier, fromFile) {
  if (specifier.startsWith('@clerk/')) {
    return SERVER_ONLY_CLERK.has(specifier) ? null : { clerk: true };
  }

  let base;
  if (specifier.startsWith('@/')) {
    base = path.join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // A package, or an alias to generated code. Neither can reach app source.
    return null;
  }

  const cached = resolveCache.get(base);
  if (cached !== undefined) {
    return cached;
  }

  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    base,
  ];

  let resolved = null;
  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf8');
      resolved = { file: candidate };
      break;
    } catch {
      // Not this one.
    }
  }

  resolveCache.set(base, resolved);
  return resolved;
}

const sourceCache = new Map();

async function readSource(file) {
  const cached = sourceCache.get(file);
  if (cached !== undefined) {
    return cached;
  }
  const source = await readFile(file, 'utf8');
  sourceCache.set(file, source);
  return source;
}

/**
 * Breadth-first walk of the static import graph, returning the shortest chain
 * of files from `entry` to a module importing `@clerk/*`, or null if none does.
 */
async function findClerkImport(entry) {
  const seen = new Set([entry]);
  const queue = [[entry]];

  while (queue.length > 0) {
    const chain = queue.shift();
    const file = chain.at(-1);
    const source = await readSource(file);

    const specifiers = [
      ...[...source.matchAll(staticImport)].map((match) => match[1]),
      ...[...source.matchAll(sideEffectImport)].map((match) => match[1]),
    ];

    for (const specifier of specifiers) {
      const target = await resolveModule(specifier, file);
      if (!target) {
        continue;
      }
      if (target.clerk) {
        return { chain, specifier };
      }
      if (seen.has(target.file)) {
        continue;
      }
      seen.add(target.file);
      queue.push([...chain, target.file]);
    }
  }

  return null;
}

const routeFiles = await findFiles(routesRoot);
const violations = [];

for (const file of routeFiles) {
  const routePath = routePathFor(file);
  if (!routePath || !isClerkFreeRoute(routePath)) {
    continue;
  }

  const hit = await findClerkImport(file);
  if (hit) {
    violations.push({ routePath, ...hit });
  }
}

if (violations.length === 0) {
  process.exit(0);
}

console.error(
  'These routes are listed as Clerk-free but statically import Clerk. Clerk ' +
    'components throw without a <ClerkProvider />, so a signed-out visitor ' +
    'gets the error boundary, not a slower page:',
);

for (const { routePath, chain, specifier } of violations) {
  const readableChain = chain
    .map((file) => path.relative(appRoot, file).split(path.sep).join('/'))
    .join('\n      -> ');
  console.error(
    `\n- ${routePath}\n      ${readableChain}\n      -> ${specifier}`,
  );
}

console.error(
  '\nPrompt for sign-in through SignInPrompt / SignInActionButton / ' +
    'requestSignIn, and read auth state with useViewerSession(). Removing the ' +
    'route from the allowlist is not the fix: it only makes it slow again.',
);

process.exit(1);
