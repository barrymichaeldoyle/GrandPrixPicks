//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
  // Ignore build output, generated code, and config files not in tsconfig
  {
    ignores: [
      '.output/**',
      'storybook-static/**',
      'convex/_generated/**',
      '.storybook/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  ...tanstackConfig,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      prettier: eslintPluginPrettier,
    },
    rules: {
      'sort-imports': 'off', // use simple-import-sort instead
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/order': 'off', // use simple-import-sort instead
      'prettier/prettier': 'error',
      curly: ['error', 'all'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'Default exports are not allowed. Use named exports instead.',
        },
      ],
    },
  },
  // Files that require default exports (configs, frameworks, storybook)
  {
    files: [
      'vite.config.ts',
      'playwright.config.ts',
      'convex/**/*.ts',
      '**/*.stories.tsx',
      '**/*.stories.ts',
      'src/integrations/tanstack-query/devtools.tsx',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  eslintConfigPrettier,
  // Re-enable curly after Prettier (Prettier sets it off); require braces for all control statements
  {
    rules: {
      curly: ['error', 'all'],
    },
  },
];
