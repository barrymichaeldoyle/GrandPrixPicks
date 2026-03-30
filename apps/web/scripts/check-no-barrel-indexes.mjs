import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(appRoot, 'src');

const allowedPatterns = [
  /^src\/routes\/.*\/index\.tsx?$/,
  /^src\/routes\/index\.tsx?$/,
];
const barrelExportPattern =
  /^\s*export\s+(?:\*|\{[\s\S]*?\}|type\s+\{[\s\S]*?\})\s+from\s+['"][^'"]+['"]/m;

async function findIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findIndexFiles(absolutePath)));
      continue;
    }

    if (entry.name === 'index.ts' || entry.name === 'index.tsx') {
      files.push(
        path.relative(appRoot, absolutePath).split(path.sep).join('/'),
      );
    }
  }

  return files;
}

const indexFiles = await findIndexFiles(sourceRoot);
const violations = [];

for (const relativeFile of indexFiles) {
  if (allowedPatterns.some((pattern) => pattern.test(relativeFile))) {
    continue;
  }

  const absoluteFile = path.join(appRoot, relativeFile);
  const source = await readFile(absoluteFile, 'utf8');

  if (!barrelExportPattern.test(source)) {
    continue;
  }

  violations.push(relativeFile);
}

if (violations.length === 0) {
  process.exit(0);
}

console.error(
  'Re-exporting barrel index files are not allowed outside route entrypoints:',
);

for (const violation of violations) {
  console.error(`- ${violation}`);
}

process.exit(1);
