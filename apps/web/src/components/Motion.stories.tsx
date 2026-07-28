import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from './Button/Button';

/**
 * The app's motion vocabulary. These are hand-written keyframes in styles.css
 * rather than Tailwind utilities, so they are invisible unless you go looking -
 * which is exactly why they belong in the design system.
 *
 * Everything here is disabled under `prefers-reduced-motion: reduce`.
 */
const meta = {
  title: 'Design System/Motion',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Page entrance. Sections stagger in with `reveal-up` plus a delay class, so
 * content resolves top-down instead of appearing all at once. Re-run the story
 * to replay it.
 */
export const RevealUp: Story = {
  render: () => {
    const [key, setKey] = useState(0);

    return (
      <div className="max-w-lg">
        <Button size="sm" onClick={() => setKey((k) => k + 1)}>
          Replay
        </Button>
        <div key={key} className="mt-6 space-y-3">
          {[
            ['reveal-up', 'no delay'],
            ['reveal-up reveal-delay-1', '0.08s'],
            ['reveal-up reveal-delay-2', '0.14s'],
            ['reveal-up reveal-delay-3', '0.2s'],
          ].map(([cls, label]) => (
            <div
              key={cls}
              className={`${cls} rounded-lg border border-border bg-surface p-3`}
            >
              <code className="text-xs text-text-muted">{cls}</code>
              <span className="ml-2 text-xs text-text-muted">({label})</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

/**
 * The announcement banner expands and collapses by animating grid rows, which
 * is how it can transition to and from `auto` height. `banner-rail-sweep`
 * draws the accent rail across as it lands.
 */
export const BannerDrop: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <div className="max-w-lg">
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Collapse' : 'Expand'}
        </Button>
        <div className="mt-6">
          {open ? (
            <div className="banner-drop-in">
              <div className="banner-drop-inner">
                <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-4">
                  <div className="banner-rail-sweep absolute inset-x-0 top-0 h-0.5 bg-accent" />
                  <p className="text-sm text-text">
                    Results for the Hungarian Grand Prix are now published.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="banner-drop-out">
              <div className="banner-drop-inner">
                <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-4">
                  <p className="text-sm text-text">Collapsing…</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
};

/** The two Tailwind animations the app leans on for pending state. */
export const PendingState: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <span className="inline-flex h-8 w-8 animate-spin items-center justify-center rounded-full border-2 border-border border-t-accent" />
        <div className="mt-2 text-xs text-text-muted">animate-spin</div>
      </div>
      <div className="text-center">
        <span className="inline-flex animate-pulse items-center rounded-full border border-warning/35 bg-warning-muted/50 px-2 py-0.5 text-xs font-semibold text-warning">
          Closing soon
        </span>
        <div className="mt-2 text-xs text-text-muted">animate-pulse</div>
      </div>
    </div>
  ),
};
