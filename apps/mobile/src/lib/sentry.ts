import * as Sentry from '@sentry/react-native';

/**
 * Initialise Sentry. Mirrors the web setup in apps/web/src/router.tsx, but
 * pulled out so it can run as a module-top side-effect before React mounts —
 * Sentry only captures errors after init.
 *
 * ## Required env vars
 *
 * **Runtime (build-inlined, safe to expose):**
 *   EXPO_PUBLIC_SENTRY_DSN                — DSN for this project
 *   EXPO_PUBLIC_SENTRY_ENV                — production / preview / dev
 *   EXPO_PUBLIC_SENTRY_RELEASE            — release identifier (optional)
 *   EXPO_PUBLIC_SENTRY_DIST               — build dist identifier (optional)
 *   EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE — 0–1, default 0.2
 *
 * **EAS build-time (NEVER prefix with EXPO_PUBLIC — these stay server-side
 * and are used by the Sentry config plugin to upload sourcemaps + native
 * symbols during the EAS build):**
 *   SENTRY_AUTH_TOKEN
 *   SENTRY_ORG
 *   SENTRY_PROJECT
 *
 * Set the build-time vars via `eas secret:create` so they're available to the
 * Sentry plugin's iOS/Android build script without committing them.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // No DSN — skip silently. Common in dev / preview clients.
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV ?? 'production',
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
    dist: process.env.EXPO_PUBLIC_SENTRY_DIST,
    tracesSampleRate: Number(
      process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.2',
    ),
    sendDefaultPii: true,
    enableNative: true,
    // Don't auto-capture console logs — Convex + Clerk are noisy in dev.
    enableAutoSessionTracking: true,
  });
}

export { Sentry };
