import type { Meta, StoryObj } from '@storybook/react';

import {
  DriverBadge,
  DriverBadgeSkeleton,
  ScoredDriverBadge,
} from './DriverBadge';

const meta = {
  title: 'Components/DriverBadge',
  component: DriverBadge,
  parameters: {
    layout: 'padded',
  },
  args: {
    code: 'VER',
    team: 'Red Bull Racing',
    displayName: 'Max Verstappen',
    number: 1,
    nationality: 'NL',
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
          <DriverBadge
            size="sm"
            code="HAM"
            team="Ferrari"
            displayName="Lewis Hamilton"
            number={44}
            nationality="GB"
          />
          <DriverBadge
            size="md"
            code="PIA"
            team="McLaren"
            displayName="Oscar Piastri"
            number={81}
            nationality="AU"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-text uppercase">
          With Number
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <DriverBadge
            code="LEC"
            team="Ferrari"
            displayName="Charles Leclerc"
            number={16}
            nationality="MC"
            showNumber
          />
          <DriverBadge
            size="sm"
            code="NOR"
            team="McLaren"
            displayName="Lando Norris"
            number={4}
            nationality="GB"
            showNumber
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-text uppercase">
          Scored + Loading
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <ScoredDriverBadge
            code="RUS"
            team="Mercedes"
            displayName="George Russell"
            number={63}
            nationality="GB"
            pickPoints={5}
          />
          <ScoredDriverBadge
            code="ALO"
            team="Aston Martin"
            displayName="Fernando Alonso"
            number={14}
            nationality="ES"
            pickPoints={0}
          />
          <DriverBadgeSkeleton size="sm" />
          <DriverBadgeSkeleton size="md" />
        </div>
      </div>
    </div>
  ),
};
