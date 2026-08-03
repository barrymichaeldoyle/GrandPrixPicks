import type { Meta, StoryObj } from '@storybook/react';

import { Flag } from './Flag';
import { RaceFlag } from './RaceFlag';

const meta = {
  title: 'Components/Flag',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Every flag asset shipped in public/flags, i.e. every country on the calendar. */
const AVAILABLE = [
  'ae',
  'ar',
  'at',
  'au',
  'az',
  'be',
  'bh',
  'br',
  'ca',
  'cn',
  'de',
  'es',
  'fi',
  'fr',
  'gb',
  'hu',
  'it',
  'jp',
  'mc',
  'mx',
  'nl',
  'nz',
  'pt',
  'qa',
  'sa',
  'sg',
  'th',
  'us',
];

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <div key={size} className="text-center">
          <Flag code="IT" size={size} />
          <div className="mt-2 text-xs text-text-muted">{size}</div>
        </div>
      ))}
    </div>
  ),
};

export const AllCountries: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 sm:grid-cols-7">
      {AVAILABLE.map((code) => (
        <div key={code} className="text-center">
          <Flag code={code} size="md" />
          <div className="gpp-mono mt-1 text-xs text-text-muted uppercase">
            {code}
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * A missing asset is hidden rather than showing the browser's broken-image
 * glyph, so a country we have no flag for leaves a gap instead of a mess.
 */
export const MissingAsset: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Flag code="IT" size="lg" />
      <Flag code="zz" size="lg" />
      <span className="text-xs text-text-muted">
        second slot is an unknown code
      </span>
    </div>
  ),
};

/** RaceFlag maps race-facing size names onto the underlying Flag scale. */
export const RaceFlagSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="text-center">
          <RaceFlag countryCode="JP" size={size} />
          <div className="mt-2 text-xs text-text-muted">{size}</div>
        </div>
      ))}
      <div className="text-center">
        <div className="h-12">
          <RaceFlag countryCode="JP" size="full" />
        </div>
        <div className="mt-2 text-xs text-text-muted">full (fills height)</div>
      </div>
    </div>
  ),
};
