import type { ReactNode } from 'react';

import { TabSwitch } from '@/components/TabSwitch';

export type GapMode = 'leader' | 'ahead';

/**
 * The scroll container every standings table sits in.
 *
 * `role="region"` with a name and a tab stop is what makes a table that can
 * scroll sideways reachable by keyboard: without it the only way to reach the
 * columns past the edge of a phone is a swipe.
 */
export function StandingsTableFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {children}
    </div>
  );
}

/**
 * Switches the Gap column between the leader and the entry directly ahead.
 *
 * The column it changes is called Gap, so the buttons are not: two buttons
 * both starting "Gap to" made the reader compare the ends of two long labels
 * to find the one word that differs.
 */
export function GapModeToggle({
  value,
  onChange,
  aheadLabel,
  id,
}: {
  value: GapMode;
  onChange: (value: GapMode) => void;
  aheadLabel: string;
  id: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="gpp-label text-text-muted">Gap</span>
      <TabSwitch
        id={id}
        value={value}
        onChange={onChange}
        ariaLabel="What the gap column measures"
        options={[
          { value: 'leader', label: 'Leader' },
          { value: 'ahead', label: aheadLabel },
        ]}
      />
    </div>
  );
}

/** The column header for the Gap column, named by what it currently measures. */
export function gapColumnLabel(mode: GapMode, aheadNoun: string): string {
  return mode === 'leader'
    ? 'Points behind the leader'
    : `Points behind the ${aheadNoun} ahead`;
}
