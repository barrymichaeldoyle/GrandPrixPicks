import type { Preview } from '@storybook/react';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Light / dark mode',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? 'light';
      const themeClass = theme === 'dark' ? 'dark' : '';
      return (
        <div
          className={themeClass}
          data-theme={theme}
          style={{
            height: '100vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
            padding: '1rem',
            backgroundColor: 'var(--page)',
          }}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
