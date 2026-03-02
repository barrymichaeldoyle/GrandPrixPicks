import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

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
    return {
      ...config,
      plugins: [...plugins, tailwindcss()],
    };
  },
};

export default config;
