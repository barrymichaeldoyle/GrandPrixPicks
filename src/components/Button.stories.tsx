import type { Meta, StoryObj } from '@storybook/react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Plus, Search, Settings } from 'lucide-react';

import { StorybookRouter } from '@/stories/router-decorator';

import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'padded',
  },
  args: {
    children: 'Make predictions',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
};

export const Playground: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    loading: false,
    disabled: false,
    saved: false,
    leftIcon: Plus,
    rightIcon: ArrowRight,
    children: 'Customize me',
  },
};

export const Showcase: Story = {
  render: () => {
    const section =
      'rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5';
    const title =
      'mb-3 text-sm font-semibold uppercase tracking-wide text-text';
    const row = 'flex flex-wrap items-center gap-3';

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-10">
        <div className={section}>
          <h3 className={title}>Variants</h3>
          <div className={row}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="text" size="inline">
              Text action
            </Button>
            <Button variant="saved" saved>
              Saved
            </Button>
          </div>
        </div>

        <div className={section}>
          <h3 className={title}>Sizes</h3>
          <div className={row}>
            <Button variant="text" size="inline" leftIcon={Plus}>
              Inline
            </Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button variant="tab" size="tab">
              Tab
            </Button>
          </div>
        </div>

        <div className={section}>
          <h3 className={title}>Icon Treatments</h3>
          <div className={row}>
            <Button leftIcon={Search}>Search</Button>
            <Button leftIcon={Plus} rightIcon={ArrowRight}>
              New League
            </Button>
            <Button variant="secondary" rightIcon={Settings}>
              Preferences
            </Button>
            <Button variant="secondary" leftIcon={Check}>
              Confirm
            </Button>
          </div>
        </div>

        <div className={section}>
          <h3 className={title}>States</h3>
          <div className={row}>
            <Button loading>Submitting</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled leftIcon={Search}>
              Disabled with icon
            </Button>
          </div>
        </div>

        <div className={section}>
          <h3 className={title}>Tabs</h3>
          <div className={row} role="tablist" aria-label="Button tabs demo">
            <Button variant="tab" size="tab" active>
              Top 5
            </Button>
            <Button variant="tab" size="tab">
              Head to Head
            </Button>
            <Button variant="tab" size="tab" disabled>
              Disabled Tab
            </Button>
          </div>
        </div>
      </div>
    );
  },
};

export const AsChildWithRouterLink: Story = {
  decorators: [
    (Story) => (
      <StorybookRouter>
        <Story />
      </StorybookRouter>
    ),
  ],
  render: () => (
    <div className="flex items-center gap-3 pb-10">
      <Button asChild size="sm" rightIcon={ArrowRight}>
        <Link to="/races/$raceSlug" params={{ raceSlug: 'australia-2026' }}>
          Go to race
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link to="/races/$raceSlug" params={{ raceSlug: 'monaco-2026' }}>
          Secondary link button
        </Link>
      </Button>
    </div>
  ),
};
