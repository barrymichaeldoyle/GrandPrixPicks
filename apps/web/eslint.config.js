// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

import { createBaseEslintConfig } from '../../eslint.base.config.mjs';

const baseEslintConfig = createBaseEslintConfig({
  tanstackConfig,
  eslintConfigPrettier,
  eslintPluginPrettier,
  simpleImportSort,
});

export default [
  // Ignore build output, generated code, and config files not in tsconfig
  {
    ignores: [
      '.output/**',
      'storybook-static/**',
      '../backend/convex/_generated/**',
      '.storybook/**',
      'eslint.config.js',
      'prettier.config.js',
      'public/sw.js',
    ],
  },
  ...baseEslintConfig,
  {
    rules: {
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array',
          readonly: 'array',
        },
      ],
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
      '**/*.stories.tsx',
      '**/*.stories.ts',
      'src/integrations/tanstack-query/devtools.tsx',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
