import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Storybook inherits the app's vite.config.ts, which is built for the real
    // server: TanStack Start and Nitro. Those two inject the server entries
    // (`#tanstack-router-entry`, `#tanstack-start-entry`) that only resolve
    // inside a Start build, and dependency optimization dies trying to follow
    // them out of `@tanstack/start-server-core`. Storybook renders components,
    // never a route tree or a server handler, so both plugins come out —
    // alongside the devtools plugin, which was already dropped for its port.
    const excludedPluginNames = [
      'tanstack-devtools-vite',
      'tanstack-start',
      'nitro',
    ];
    // Flatten first. `tanstackStart()` contributes an *array* of sub-plugins
    // (`tanstack-start:start-manifest-capture-client-build` and friends), and
    // Vite flattens nested arrays itself — so filtering the top level only
    // walks straight past a bare array without ever seeing the names inside it,
    // and the sub-plugins survive to fail the build.
    const plugins = (config.plugins ?? []).flat(Infinity).filter((p) => {
      if (!p || typeof p !== 'object' || !('name' in p)) {
        return true;
      }
      const name = (p as { name?: string }).name ?? '';
      return !excludedPluginNames.some(
        (excluded) => name === excluded || name.startsWith(`${excluded}:`),
      );
    });
    const existingAliases = config.resolve?.alias;
    const alias = [
      ...(Array.isArray(existingAliases)
        ? existingAliases
        : existingAliases
          ? Object.entries(existingAliases).map(([find, replacement]) => ({
              find,
              replacement,
            }))
          : []),
      {
        find: /^@clerk\/react$/,
        replacement: fileURLToPath(
          new URL('../src/storybook/mockClerkReact.tsx', import.meta.url),
        ),
      },
      {
        find: 'convex/react',
        replacement: fileURLToPath(
          new URL('../src/storybook/mockConvexReact.tsx', import.meta.url),
        ),
      },
    ];
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias,
      },
      plugins: [...plugins, tailwindcss()],
    };
  },
};

export default config;
