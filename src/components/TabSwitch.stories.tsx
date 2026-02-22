import type { Meta, StoryObj } from '@storybook/react';
import { Globe, Swords, Trophy, Users } from 'lucide-react';
import { useState } from 'react';

import { TabSwitch } from './TabSwitch';

const meta = {
  title: 'Components/TabSwitch',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const LeaderboardFilters: Story = {
  render: () => {
    const [scope, setScope] = useState<'global' | 'following'>('global');
    const [mode, setMode] = useState<'top5' | 'h2h'>('top5');

    return (
      <div className="w-full max-w-3xl rounded-xl border border-border bg-surface-muted/50 p-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="sm:border-r sm:border-border sm:pr-4">
            <TabSwitch
              value={scope}
              onChange={setScope}
              options={[
                { value: 'global', label: 'Global', leftIcon: Globe },
                { value: 'following', label: 'Following', leftIcon: Users },
              ]}
              className="flex gap-1"
              buttonClassName="flex-1 sm:flex-initial"
              ariaLabel="Scope tabs"
            />
          </div>
          <TabSwitch
            value={mode}
            onChange={setMode}
            options={[
              { value: 'top5', label: 'Top 5', leftIcon: Trophy },
              { value: 'h2h', label: 'Head to Head', leftIcon: Swords },
            ]}
            className="flex flex-1 gap-1"
            buttonClassName="flex-1"
            ariaLabel="Mode tabs"
          />
        </div>
      </div>
    );
  },
};

export const Compact: Story = {
  render: () => {
    const [value, setValue] = useState<'active' | 'archived'>('active');
    return (
      <TabSwitch
        value={value}
        onChange={setValue}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived' },
        ]}
        className="flex gap-1"
        ariaLabel="Compact tabs"
      />
    );
  },
};
