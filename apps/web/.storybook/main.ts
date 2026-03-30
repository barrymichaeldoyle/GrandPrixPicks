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
    // Exclude TanStack devtools to avoid port conflict; add Tailwind
    const plugins = (config.plugins ?? []).filter(
      (p) =>
        p &&
        typeof p === 'object' &&
        'name' in p &&
        (p as { name?: string }).name !== 'tanstack-devtools-vite',
    );
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
        find: '@clerk/react',
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
