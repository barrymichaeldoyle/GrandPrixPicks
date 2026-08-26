import type { Decorator } from '@storybook/react';

/**
 * The width a card gets in the dashboard's right rail.
 *
 * These cards only ever render in a rail, and most of their layout problems
 * (wrapping headers, truncation, a button that reflows onto its own line) only
 * show up at that width. A story that renders them full-bleed is a story that
 * cannot fail the way the real page does.
 */
export const RAIL_WIDTH = 300;

export const railDecorator: Decorator[] = [
  (Story) => (
    <div style={{ width: RAIL_WIDTH }}>
      <Story />
    </div>
  ),
];
