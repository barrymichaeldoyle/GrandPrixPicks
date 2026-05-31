const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Note: we used to wrap this with `@sentry/react-native/metro`'s
// `getSentryExpoConfig` for in-bundle debugIds, but @sentry/react-native@7.11
// references a Metro internal (`metro/src/DeltaBundler/Serializers/baseJSBundle`)
// that was removed in Metro 0.83 (Expo SDK 55). Sentry still uploads sourcemaps
// via the EAS native build plugin (declared in app.json) — only the metro-side
// debugId tagging is missing. Re-enable when a Metro 0.83-compatible Sentry RN
// (likely 8.x) is supported by Expo's `expo install` recommendations.
const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  ...new Set([...(config.watchFolders ?? []), workspaceRoot]),
];
config.resolver.nodeModulesPaths = [
  ...new Set([
    ...(config.resolver.nodeModulesPaths ?? []),
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ]),
];

module.exports = config;
