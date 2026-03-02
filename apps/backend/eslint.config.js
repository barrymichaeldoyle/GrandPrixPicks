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
  {
    ignores: ['convex/_generated/**'],
  },
  ...baseEslintConfig,
];
