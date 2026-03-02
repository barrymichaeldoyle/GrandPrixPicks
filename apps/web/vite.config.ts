import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

// Use Cloudflare Pages preset when CF_PAGES env var is set (during deployment)
const nitroPreset = process.env.CF_PAGES ? 'cloudflare-pages' : 'node-server';
const isVitest = process.env.VITEST === 'true';
const isCloudflarePages = process.env.CF_PAGES === '1';
const require = createRequire(import.meta.url);
const sentryTanstackPackageJsonPath =
  require.resolve('@sentry/tanstackstart-react/package.json');
const sentryTanstackClientEntry = join(
  dirname(sentryTanstackPackageJsonPath),
  'build/esm/index.client.js',
);

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.VITE_SENTRY_ORG;
const sentryProject = process.env.VITE_SENTRY_PROJECT;

const config = defineConfig(({ mode }) => {
  const isProductionBuild = mode === 'production';
  const sentryEnabled =
    isProductionBuild && sentryAuthToken && sentryOrg && sentryProject;

  return {
    server: {
      allowedHosts: ['dev.grandprixpicks.com'],
    },
    resolve: {
      ...(isCloudflarePages ? { conditions: ['browser'] } : {}),
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        ...(isCloudflarePages
          ? { '@sentry/tanstackstart-react': sentryTanstackClientEntry }
          : {}),
      },
    },
    build: {
      sourcemap: 'hidden',
    },
    plugins: [
      devtools(),
      // Skip Nitro and TanStack Start in Vitest to avoid CJS/ESM errors and hanging process
      ...(isVitest
        ? []
        : [
            nitro({
              preset: nitroPreset,
              wasm: {},
              scanDirs: ['server'],
              rollupConfig: {
                external: (id) => {
                  if (id.startsWith('cloudflare:')) {
                    return true;
                  }
                  if (nitroPreset === 'node-server') {
                    return (
                      id === 'fsevents' ||
                      id === 'chokidar' ||
                      id.includes('fsevents') ||
                      id.endsWith('.node')
                    );
                  }
                  return false;
                },
              },
            }),
          ]),
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      ...(isVitest ? [] : [tanstackStart()]),
      viteReact({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
      // Sentry plugin last so source maps are generated and can be uploaded
      ...(sentryEnabled
        ? [
            sentryVitePlugin({
              org: sentryOrg,
              project: sentryProject,
              authToken: sentryAuthToken,
              sourcemaps: {
                assets: ['.output/public/**', 'dist/**'],
                filesToDeleteAfterUpload: [
                  '.output/**/*.map',
                  '**/client/**/*.map',
                ],
              },
            }),
          ]
        : []),
    ],
    test: {
      environment: 'jsdom',
      include: [
        'src/**/*.{test,spec}.{ts,tsx}',
        '../backend/convex/**/*.{test,spec}.{ts,tsx}',
      ],
      passWithNoTests: true,
    },
  };
});

export default config;
