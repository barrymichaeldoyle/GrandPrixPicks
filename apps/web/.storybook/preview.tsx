import type { Preview } from '@storybook/react';
import '../src/styles.css';

import { StorybookMockProviders } from '../src/storybook/mockAppRuntime';

/**
 * Viewport presets that match the ones used in real review screenshots.
 * The toolbar viewport selector applies these to the rendering iframe.
 */
const VIEWPORTS = {
  mobile: {
    name: 'Mobile (390 × 844)',
    styles: { width: '390px', height: '844px' },
    type: 'mobile' as const,
  },
  mobileSmall: {
    name: 'Mobile small (360 × 800)',
    styles: { width: '360px', height: '800px' },
    type: 'mobile' as const,
  },
  tablet: {
    name: 'Tablet (768 × 1024)',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet' as const,
  },
  desktop: {
    name: 'Desktop (1280 × 800)',
    styles: { width: '1280px', height: '800px' },
    type: 'desktop' as const,
  },
  desktopWide: {
    name: 'Desktop wide (1440 × 900)',
    styles: { width: '1440px', height: '900px' },
    type: 'desktop' as const,
  },
};

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
    viewport: {
      options: VIEWPORTS,
    },
  },
  initialGlobals: {
    viewport: { value: 'desktopWide', isRotated: false },
  },
  decorators: [
    (Story) => (
      <StorybookMockProviders>
        <div
          className="dark"
          data-theme="dark"
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
      </StorybookMockProviders>
    ),
  ],
};

export default preview;
