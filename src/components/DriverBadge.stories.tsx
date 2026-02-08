import type { Meta, StoryObj } from '@storybook/react';

import {
  DriverBadge,
  DriverBadgeSkeleton,
  ScoredDriverBadge,
  TEAM_COLORS,
} from './DriverBadge';

const meta: Meta<typeof DriverBadge> = {
  title: 'Design System/Driver Badge',
  component: DriverBadge,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Team-colored badges showing driver 3-letter codes. Used in results tables to visually match picks with actual results.',
      },
    },
  },
  argTypes: {
    team: {
      control: 'select',
      options: [null, ...Object.keys(TEAM_COLORS)],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    showNumber: {
      control: 'boolean',
    },
  },
};

export default meta;

type Story = StoryObj<typeof DriverBadge>;

export const Default: Story = {
  args: {
    code: 'VER',
    team: 'Red Bull Racing',
    displayName: 'Max Verstappen',
    number: 1,
    nationality: 'NL',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Hover to see the tooltip with driver details and nationality flag.',
      },
    },
  },
};

export const WithTooltip: Story = {
  args: {
    code: 'VER',
    team: 'Red Bull Racing',
    displayName: 'Max Verstappen',
    number: 1,
    nationality: 'NL',
  },
  parameters: {
    docs: {
      description: {
        story: 'Badge with full tooltip showing driver details.',
      },
    },
  },
};

export const NoTeam: Story = {
  args: {
    code: 'UNK',
    team: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Fallback gray color when team is unknown.',
      },
    },
  },
};

// All teams with their drivers (including full details for tooltips)
const TEAM_DRIVERS: Array<{
  team: string;
  drivers: Array<{
    code: string;
    name: string;
    number: number;
    nationality: string;
  }>;
}> = [
  {
    team: 'McLaren',
    drivers: [
      { code: 'NOR', name: 'Lando Norris', number: 4, nationality: 'GB' },
      { code: 'PIA', name: 'Oscar Piastri', number: 81, nationality: 'AU' },
    ],
  },
  {
    team: 'Ferrari',
    drivers: [
      { code: 'LEC', name: 'Charles Leclerc', number: 16, nationality: 'MC' },
      { code: 'HAM', name: 'Lewis Hamilton', number: 44, nationality: 'GB' },
    ],
  },
  {
    team: 'Red Bull Racing',
    drivers: [
      { code: 'VER', name: 'Max Verstappen', number: 1, nationality: 'NL' },
      { code: 'HAD', name: 'Isack Hadjar', number: 6, nationality: 'FR' },
    ],
  },
  {
    team: 'Mercedes',
    drivers: [
      { code: 'RUS', name: 'George Russell', number: 63, nationality: 'GB' },
      { code: 'ANT', name: 'Kimi Antonelli', number: 12, nationality: 'IT' },
    ],
  },
  {
    team: 'Aston Martin',
    drivers: [
      { code: 'ALO', name: 'Fernando Alonso', number: 14, nationality: 'ES' },
      { code: 'STR', name: 'Lance Stroll', number: 18, nationality: 'CA' },
    ],
  },
  {
    team: 'Alpine',
    drivers: [
      { code: 'GAS', name: 'Pierre Gasly', number: 10, nationality: 'FR' },
      { code: 'COL', name: 'Franco Colapinto', number: 43, nationality: 'AR' },
    ],
  },
  {
    team: 'Williams',
    drivers: [
      { code: 'ALB', name: 'Alex Albon', number: 23, nationality: 'TH' },
      { code: 'SAI', name: 'Carlos Sainz', number: 55, nationality: 'ES' },
    ],
  },
  {
    team: 'Racing Bulls',
    drivers: [
      { code: 'LAW', name: 'Liam Lawson', number: 30, nationality: 'NZ' },
      { code: 'LIN', name: 'Arvid Lindblad', number: 41, nationality: 'GB' },
    ],
  },
  {
    team: 'Audi',
    drivers: [
      { code: 'HUL', name: 'Nico Hülkenberg', number: 27, nationality: 'DE' },
      { code: 'BOR', name: 'Gabriel Bortoleto', number: 5, nationality: 'BR' },
    ],
  },
  {
    team: 'Haas',
    drivers: [
      { code: 'OCO', name: 'Esteban Ocon', number: 31, nationality: 'FR' },
      { code: 'BEA', name: 'Oliver Bearman', number: 87, nationality: 'GB' },
    ],
  },
  {
    team: 'Cadillac',
    drivers: [
      { code: 'BOT', name: 'Valtteri Bottas', number: 77, nationality: 'FI' },
      { code: 'PER', name: 'Sergio Pérez', number: 11, nationality: 'MX' },
    ],
  },
];

export const AllTeams: Story = {
  render: () => (
    <div className="space-y-4 pt-16">
      {TEAM_DRIVERS.map(({ team, drivers }) => (
        <div key={team} className="flex items-center gap-3">
          <span className="w-32 text-sm text-text-muted">{team}</span>
          <div className="flex gap-2">
            {drivers.map((driver) => (
              <DriverBadge
                key={driver.code}
                code={driver.code}
                team={team}
                displayName={driver.name}
                number={driver.number}
                nationality={driver.nationality}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'All 11 teams with their 2026 driver lineups. Hover over badges to see driver details and nationality flags.',
      },
    },
  },
};

export const SmallSize: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-16 text-xs text-text-muted">sm</span>
        <div className="flex gap-2">
          <DriverBadge code="VER" team="Red Bull Racing" size="sm" />
          <DriverBadge code="NOR" team="McLaren" size="sm" />
          <DriverBadge code="HAM" team="Ferrari" size="sm" />
          <DriverBadge code="RUS" team="Mercedes" size="sm" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-16 text-xs text-text-muted">md</span>
        <div className="flex gap-2">
          <DriverBadge code="VER" team="Red Bull Racing" size="md" />
          <DriverBadge code="NOR" team="McLaren" size="md" />
          <DriverBadge code="HAM" team="Ferrari" size="md" />
          <DriverBadge code="RUS" team="Mercedes" size="md" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Side-by-side comparison of `sm` (for dense tables) and `md` (default) sizes.',
      },
    },
  },
};

export const WithNumber: Story = {
  args: {
    code: 'VER',
    team: 'Red Bull Racing',
    displayName: 'Max Verstappen',
    number: 1,
    nationality: 'NL',
    showNumber: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Badge with `showNumber={true}` — displays racing number before the code.',
      },
    },
  },
};

export const ScoringStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-text-muted">5 pts (exact)</span>
        <ScoredDriverBadge
          code="VER"
          team="Red Bull Racing"
          displayName="Max Verstappen"
          number={1}
          nationality="NL"
          pickPoints={5}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-text-muted">3 pts (close)</span>
        <ScoredDriverBadge
          code="NOR"
          team="McLaren"
          displayName="Lando Norris"
          number={4}
          nationality="GB"
          pickPoints={3}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-text-muted">1 pt (in top 5)</span>
        <ScoredDriverBadge
          code="HAM"
          team="Ferrari"
          displayName="Lewis Hamilton"
          number={44}
          nationality="GB"
          pickPoints={1}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-text-muted">0 pts (miss)</span>
        <ScoredDriverBadge
          code="ALO"
          team="Aston Martin"
          displayName="Fernando Alonso"
          number={14}
          nationality="ES"
          pickPoints={0}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'All 4 scoring states: 5 pts (green ring + dot), 3 pts (yellow ring + dot), 1 pt (muted ring), 0 pts (red ring + faded).',
      },
    },
  },
};

export const PickComparison: Story = {
  render: () => (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2 text-left text-text-muted">Pos</th>
            <th className="px-4 py-2 text-left text-text-muted">Result</th>
            <th className="px-4 py-2 text-left text-text-muted">Your Pick</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border bg-accent-muted/50">
            <td className="px-4 py-2 text-text-muted">P1</td>
            <td className="px-4 py-2">
              <DriverBadge
                code="VER"
                team="Red Bull Racing"
                displayName="Max Verstappen"
                number={1}
                nationality="NL"
              />
            </td>
            <td className="px-4 py-2">
              <DriverBadge
                code="VER"
                team="Red Bull Racing"
                displayName="Max Verstappen"
                number={1}
                nationality="NL"
              />
            </td>
          </tr>
          <tr className="border-b border-border bg-accent-muted/50">
            <td className="px-4 py-2 text-text-muted">P2</td>
            <td className="px-4 py-2">
              <DriverBadge
                code="NOR"
                team="McLaren"
                displayName="Lando Norris"
                number={4}
                nationality="GB"
              />
            </td>
            <td className="px-4 py-2">
              <DriverBadge
                code="HAM"
                team="Ferrari"
                displayName="Lewis Hamilton"
                number={44}
                nationality="GB"
              />
            </td>
          </tr>
          <tr className="border-b border-border bg-accent-muted/50">
            <td className="px-4 py-2 text-text-muted">P3</td>
            <td className="px-4 py-2">
              <DriverBadge
                code="HAM"
                team="Ferrari"
                displayName="Lewis Hamilton"
                number={44}
                nationality="GB"
              />
            </td>
            <td className="px-4 py-2">
              <DriverBadge
                code="NOR"
                team="McLaren"
                displayName="Lando Norris"
                number={4}
                nationality="GB"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Example showing how badges help visually match picks with results. Hover to see driver details.',
      },
    },
  },
};

/** Skeleton next to real badges so you can match size (e.g. h-6, min-w, rounded-md). */
export const SkeletonComparison: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-text-muted">Skeleton (md)</span>
          <DriverBadgeSkeleton />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-text-muted">VER (md)</span>
          <DriverBadge
            code="VER"
            team="Red Bull Racing"
            displayName="Max Verstappen"
            number={1}
            nationality="NL"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-text-muted">Skeleton (sm)</span>
          <DriverBadgeSkeleton size="sm" />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-text-muted">VER (sm)</span>
          <DriverBadge
            code="VER"
            team="Red Bull Racing"
            displayName="Max Verstappen"
            number={1}
            nationality="NL"
            size="sm"
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Compare skeleton height and width to real badges at both `sm` and `md` sizes.',
      },
    },
  },
};
