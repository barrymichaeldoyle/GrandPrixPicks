import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import babel from '@rolldown/plugin-babel';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';

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
const sentryRelease =
  process.env.VITE_SENTRY_RELEASE ??
  process.env.SENTRY_RELEASE ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA;
const sentryDist =
  process.env.VITE_SENTRY_DIST ??
  process.env.CF_PAGES_BRANCH ??
  process.env.GITHUB_RUN_NUMBER;
const reactCompiler = reactCompilerPreset();
reactCompiler.rolldown.filter = {
  id: {
    include: ['src/**/*.{js,jsx,ts,tsx}'],
    exclude: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
};

const config = defineConfig(({ mode }) => {
  const isProductionBuild = mode === 'production';
  const sentryEnabled =
    isProductionBuild && sentryAuthToken && sentryOrg && sentryProject;

  return {
    server: {
      host: '127.0.0.1',
      allowedHosts: ['dev.grandprixpicks.com'],
    },
    resolve: {
      tsconfigPaths: true,
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }
            if (id.includes('framer-motion')) {
              return 'framer';
            }
            if (id.includes('@clerk')) {
              // Keep Clerk with its lazy runtime entry. Assigning it to a
              // manual shared chunk makes the root route preload that chunk.
              return;
            }
            if (id.includes('convex')) {
              return 'convex';
            }
            if (id.includes('@tanstack')) {
              return 'tanstack';
            }
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'react';
            }
            if (id.includes('@sentry')) {
              return 'sentry';
            }
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease),
      'import.meta.env.VITE_SENTRY_DIST': JSON.stringify(sentryDist),
    },
    plugins: [
      ...(devtools() as PluginOption[]),
      // Skip Nitro and TanStack Start in Vitest to avoid CJS/ESM errors and hanging process
      ...(isVitest
        ? []
        : [
            nitro({
              preset: nitroPreset,
              wasm: {},
              scanDirs: ['server'],
              rollupConfig: {
                external: (id: string) => {
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
            }) as PluginOption,
          ]),
      tailwindcss() as PluginOption,
      ...(isVitest
        ? []
        : [
            tanstackStart({
              router: {
                routeFileIgnorePattern: '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
              },
            }) as PluginOption,
          ]),
      viteReact() as PluginOption,
      ...(isProductionBuild
        ? [
            babel({
              presets: [reactCompiler],
            }) as PluginOption,
          ]
        : []),
      // Sentry plugin last so source maps are generated and can be uploaded
      ...(sentryEnabled
        ? [
            sentryVitePlugin({
              org: sentryOrg,
              project: sentryProject,
              authToken: sentryAuthToken,
              release: sentryRelease
                ? {
                    name: sentryRelease,
                    dist: sentryDist,
                  }
                : undefined,
              sourcemaps: {
                assets: ['.output/public/**', 'dist/**'],
                filesToDeleteAfterUpload: [
                  '.output/**/*.map',
                  '**/client/**/*.map',
                ],
              },
            }) as PluginOption,
          ]
        : []),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'server/**/*.{test,spec}.{ts,tsx}',
        '../../packages/shared/src/**/*.{test,spec}.{ts,tsx}',
        '../backend/convex/**/*.{test,spec}.{ts,tsx}',
      ],
      passWithNoTests: true,
    },
  };
});

export default config;
