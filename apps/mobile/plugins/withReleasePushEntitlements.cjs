/**
 * Gives the Release build its own entitlements file, asking for the production
 * APNs gateway.
 *
 * `expo-notifications` writes one entitlements file with `aps-environment:
 * development`, and prebuild points every build configuration at it. A store
 * build made from that registers sandbox push tokens, so every production
 * notification fails to deliver and nothing says so. Debug keeps the
 * development gateway (a simulator or dev-client build needs it); Release gets
 * the same entitlements with only `aps-environment` changed.
 *
 * This used to be a hand-maintained file in a committed `ios/`, which any
 * prebuild deleted. As a plugin it is regenerated with everything else, and
 * `scripts/check-native-assets.mjs` runs a prebuild and asserts the result.
 *
 * It runs as a *finalized* mod, after every other mod has written its files,
 * for two reasons found the hard way:
 *
 * - Mods run in reverse plugin order, so an ordinary entitlements mod here saw
 *   the plist before `expo-apple-authentication` had added Sign in with Apple,
 *   and the Release file shipped without it.
 * - Expo's entitlements mod reads and writes whichever file the *Release*
 *   configuration points at. Repointing Release mid-pipeline would make a
 *   second prebuild merge into the Release file and leave Debug stale. So the
 *   merged result is read once, at the end, and both files are written from it.
 */
const fs = require('node:fs');
const path = require('node:path');

const { IOSConfig, withFinalizedMod } = require('expo/config-plugins');
const plist = require('@expo/plist').default;

const RELEASE_SUFFIX = 'Release.entitlements';

function withReleasePushEntitlements(config) {
  return withFinalizedMod(config, [
    'ios',
    (mod) => {
      const { projectRoot, platformProjectRoot } = mod.modRequest;
      const project = IOSConfig.XcodeUtils.getPbxproj(projectRoot);
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
      const [, target] = IOSConfig.Target.findFirstNativeTarget(project);
      const configurations =
        IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
          project,
          target.buildConfigurationList,
        ).map(([, entry]) => entry);

      const release = configurations.find((entry) => entry.name === 'Release');
      const debugPath = `${projectName}/${projectName}.entitlements`;
      const releasePath = `${projectName}/${projectName}${RELEASE_SUFFIX}`;
      // The file Expo's entitlements mod just wrote: whatever Release pointed at.
      const merged = release?.buildSettings?.CODE_SIGN_ENTITLEMENTS?.replace(
        /"/g,
        '',
      );
      if (!merged) {
        throw new Error(
          'withReleasePushEntitlements: the Release configuration has no ' +
            'CODE_SIGN_ENTITLEMENTS, so there is nothing to copy for push.',
        );
      }

      const entitlements = plist.parse(
        fs.readFileSync(path.join(platformProjectRoot, merged), 'utf8'),
      );
      function write(relativePath, aps) {
        fs.writeFileSync(
          path.join(platformProjectRoot, relativePath),
          plist.build({ ...entitlements, 'aps-environment': aps }),
        );
      }
      write(debugPath, 'development');
      write(releasePath, 'production');

      for (const entry of configurations) {
        entry.buildSettings.CODE_SIGN_ENTITLEMENTS =
          entry.name === 'Release' ? releasePath : debugPath;
      }
      fs.writeFileSync(project.filepath, project.writeSync());
      return mod;
    },
  ]);
}

module.exports = withReleasePushEntitlements;
