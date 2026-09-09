// EXPO_PUBLIC_SENTRY_RELEASE and EXPO_PUBLIC_SENTRY_DIST are deliberately absent.
// @sentry/react-native uploads source maps and dSYMs under
// `<bundleId>@<version>+<buildNumber>` with dist `<buildNumber>`, and derives the
// same pair at runtime when neither is set. Pinning them by hand only creates a
// way for the two to disagree: `eas.json` uses `autoIncrement`, so any literal
// goes stale on the next build, and the symptom is silent. Uploads succeed, the
// build log looks clean, and every crash arrives minified.
const productionVariables = [
  'EXPO_PUBLIC_CONVEX_URL',
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_SENTRY_ENV',
  'EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE',
  'EXPO_PUBLIC_POSTHOG_KEY',
  'EXPO_PUBLIC_POSTHOG_HOST',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
];

if (process.env.EAS_BUILD_PROFILE === 'production') {
  const missing = productionVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(
      `Production build is missing required EAS variables:\n${missing.map((name) => `- ${name}`).join('\n')}`,
    );
    process.exit(1);
  }

  if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) {
    console.error(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a live Clerk key for production builds.',
    );
    process.exit(1);
  }

  if (process.env.EXPO_PUBLIC_SENTRY_ENV !== 'production') {
    console.error(
      'EXPO_PUBLIC_SENTRY_ENV must be "production" for production builds.',
    );
    process.exit(1);
  }
}
