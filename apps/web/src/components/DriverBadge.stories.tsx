import type { Meta, StoryObj } from '@storybook/react';

import {
  DriverBadge,
  DriverBadgeSkeleton,
  ScoredDriverBadge,
} from './DriverBadge';
import { mockDrivers } from '../storybook/fixtures';

const meta = {
  title: 'Components/DriverBadge',
  component: DriverBadge,
  parameters: {
    layout: 'padded',
  },
  args: {
    code: mockDrivers.VER.code,
    team: mockDrivers.VER.team,
    displayName: mockDrivers.VER.displayName,
    number: mockDrivers.VER.number,
    nationality: mockDrivers.VER.nationality,
  },
} satisfies Meta<typeof DriverBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CenteringShowcase: Story = {
  render: () => (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-10">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-text uppercase">
          Sizes
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <DriverBadge size="sm" {...mockDrivers.HAM} />
          <DriverBadge size="md" {...mockDrivers.PIA} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-text uppercase">
          With Number
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <DriverBadge {...mockDrivers.LEC} showNumber />
          <DriverBadge size="sm" {...mockDrivers.NOR} showNumber />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-text uppercase">
          Scored + Loading
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <ScoredDriverBadge {...mockDrivers.RUS} pickPoints={5} />
          <ScoredDriverBadge {...mockDrivers.ALO} pickPoints={0} />
          <DriverBadgeSkeleton size="sm" />
          <DriverBadgeSkeleton size="md" />
        </div>
      </div>
    </div>
  ),
};
