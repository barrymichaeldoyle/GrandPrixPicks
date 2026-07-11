const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const BLOCK = `
# Added by plugins/withSentryPnpmWorkaround.cjs (prebuild regenerates this file).
# Sentry sourcemap/dSYM auto-upload is disabled: @sentry/react-native@7.11's
# Xcode build scripts cannot resolve @sentry/cli under this pnpm monorepo
# layout, which fails the "Bundle React Native code and images" phase.
# Remove the plugin (and set SENTRY_* secrets on EAS) once Expo's SDK pins
# @sentry/react-native 8.x, which fixes the pnpm path resolution.
export SENTRY_DISABLE_AUTO_UPLOAD=true
# Pre-set the CLI path so the Sentry scripts skip their \`require.resolve('@sentry/cli')\`
# lookup, which throws under pnpm and aborts the build (set -e) before the
# SENTRY_DISABLE_AUTO_UPLOAD check is ever reached.
export SENTRY_CLI_EXECUTABLE="$PROJECT_DIR/../node_modules/@sentry/react-native/node_modules/.bin/sentry-cli"
`;

/** Re-appends the pnpm Sentry workaround to ios/.xcode.env after prebuild. */
function withSentryPnpmWorkaround(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const envPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        '.xcode.env',
      );
      const current = fs.existsSync(envPath)
        ? fs.readFileSync(envPath, 'utf8')
        : '';
      if (!current.includes('SENTRY_DISABLE_AUTO_UPLOAD')) {
        fs.writeFileSync(envPath, current + BLOCK);
      }
      return modConfig;
    },
  ]);
}

module.exports = withSentryPnpmWorkaround;
