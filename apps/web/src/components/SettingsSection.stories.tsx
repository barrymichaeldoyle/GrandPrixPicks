import type { Meta, StoryObj } from '@storybook/react';
import { Bell, Globe, User } from 'lucide-react';

import { SettingsSection } from './SettingsSection';

const meta = {
  title: 'Components/SettingsSection',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function field(label: string, value: string) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div className="max-w-2xl">
      <SettingsSection
        title="Profile"
        icon={<User size={16} className="text-accent" />}
      >
        {field('Username', 'barry')}
        {field('Display name', 'Barry Doyle')}
      </SettingsSection>
    </div>
  ),
};

/** headerRight carries a per-section action or status. */
export const WithHeaderAction: Story = {
  render: () => (
    <div className="max-w-2xl">
      <SettingsSection
        title="Notifications"
        icon={<Bell size={16} className="text-accent" />}
        headerRight={
          <span className="text-xs font-semibold text-success">Enabled</span>
        }
      >
        {field('Session lock reminders', 'On')}
        {field('Results published', 'On')}
      </SettingsSection>
    </div>
  ),
};

/** Sections stack on the page background with no wrapper card around them. */
export const Stacked: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <SettingsSection
        title="Profile"
        icon={<User size={16} className="text-accent" />}
      >
        {field('Username', 'barry')}
      </SettingsSection>
      <SettingsSection
        title="Regional"
        icon={<Globe size={16} className="text-accent" />}
      >
        {field('Time zone', 'Africa/Johannesburg')}
        {field('Time format', '24 hour')}
      </SettingsSection>
      <SettingsSection
        title="Notifications"
        icon={<Bell size={16} className="text-accent" />}
      >
        {field('Push', 'On')}
      </SettingsSection>
    </div>
  ),
};
