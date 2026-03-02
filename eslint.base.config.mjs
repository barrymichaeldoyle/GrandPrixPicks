/**
 * @param {object} deps
 * @param {import('eslint').Linter.Config[]} deps.tanstackConfig
 * @param {import('eslint').Linter.Config} deps.eslintConfigPrettier
 * @param {*} deps.eslintPluginPrettier
 * @param {*} deps.simpleImportSort
 */
export function createBaseEslintConfig({
  tanstackConfig,
  eslintConfigPrettier,
  eslintPluginPrettier,
  simpleImportSort,
}) {
  return [
    ...tanstackConfig,
    {
      plugins: {
        'simple-import-sort': simpleImportSort,
        prettier: eslintPluginPrettier,
      },
      rules: {
        'sort-imports': 'off',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'import/order': 'off',
        'prettier/prettier': 'error',
        'func-style': ['error', 'declaration'],
        curly: ['error', 'all'],
      },
    },
    eslintConfigPrettier,
    {
      rules: {
        curly: ['error', 'all'],
      },
    },
  ];
}
