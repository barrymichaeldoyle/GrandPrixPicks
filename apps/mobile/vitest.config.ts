import { defineConfig } from 'vitest/config';

/**
 * Unit tests for mobile's pure logic (lib/ helpers).
 *
 * Scoped to plain TS so the suite never has to boot React Native or Expo
 * native modules — anything that reaches for native (MMKV, haptics, Convex
 * hooks) is mocked in the individual test files.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
