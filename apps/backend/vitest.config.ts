import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    // The suite runs inside `ci:check` beside the web and shared suites, and
    // under that load a convex-test case that takes 300 ms alone has gone past
    // the 5 s default and rejected a push for a change that never touched the
    // backend. A hung test still fails, just later.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
