import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { PredictionCountdownBadge } from './PredictionCountdownBadge';

const meta = {
  title: 'Components/PredictionCountdownBadge',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The countdown ticks every second, so the offsets are anchored once on mount
 * rather than recomputed each render.
 */
function useLockTimes() {
  const [now] = useState(() => Date.now());
  return {
    days: now + 3 * DAY + 4 * HOUR,
    hours: now + 2 * HOUR + 30 * MINUTE,
    minutes: now + 45 * MINUTE,
    seconds: now + 30_000,
    passed: now - HOUR,
  };
}

export const Durations: Story = {
  render: () => {
    const lock = useLockTimes();

    return (
      <div className="flex flex-col items-start gap-3">
        {(
          [
            ['days out', lock.days],
            ['hours out', lock.hours],
            ['under an hour', lock.minutes],
            ['seconds out', lock.seconds],
            ['already locked', lock.passed],
          ] as const
        ).map(([label, at]) => (
          <div key={label} className="flex items-center gap-4">
            <code className="w-32 shrink-0 text-xs text-text-muted">
              {label}
            </code>
            <PredictionCountdownBadge predictionLockAt={at} />
          </div>
        ))}
      </div>
    );
  },
};

/** Two copy modes for the two contexts the badge appears in. */
export const LabelModes: Story = {
  render: () => {
    const lock = useLockTimes();

    return (
      <div className="flex flex-col items-start gap-3">
        <PredictionCountdownBadge
          predictionLockAt={lock.hours}
          labelMode="predict"
        />
        <PredictionCountdownBadge
          predictionLockAt={lock.hours}
          labelMode="lock"
        />
      </div>
    );
  },
};
