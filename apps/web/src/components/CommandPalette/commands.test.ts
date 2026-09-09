import { describe, expect, it } from 'vitest';

import type { PaletteCommand } from './commands';
import {
  buildCommands,
  filterCommands,
  groupCommands,
  raceCommand,
} from './commands';

const NEXT_RACE = { name: 'Singapore Grand Prix', slug: 'singapore-2026' };

const SIGNED_IN = { signedIn: true };
const SIGNED_OUT = { signedIn: false };

describe('palette commands', () => {
  it('offers the next race as the thing to do, not a place to go', () => {
    const command = raceCommand(NEXT_RACE);

    expect(command).toMatchObject({
      label: 'Pick your Singapore Grand Prix top 5',
      group: 'Picks',
      href: '/races/singapore-2026',
    });
  });

  it('drops the race entry between seasons rather than linking to nothing', () => {
    expect(raceCommand(null)).toBeNull();
    expect(
      buildCommands(null, { signedIn: true }).some(
        (command) => command.group === 'Picks',
      ),
    ).toBe(false);
  });

  it('opens on the full list when nothing has been typed', () => {
    const commands = buildCommands(NEXT_RACE, { signedIn: true });

    expect(filterCommands(commands, '')).toHaveLength(commands.length);
    expect(filterCommands(commands, '   ')).toHaveLength(commands.length);
  });

  it('ranks a label prefix above a mid-label match', () => {
    const commands = buildCommands(NEXT_RACE, { signedIn: true });
    const labels = filterCommands(commands, 'le').map(
      (command) => command.label,
    );

    expect(labels.slice(0, 2)).toEqual(['Leaderboard', 'Leagues']);
  });

  it('matches a word inside the label as if it were a prefix', () => {
    const commands = buildCommands(NEXT_RACE, { signedIn: true });

    expect(filterCommands(commands, 'calendar')[0]?.label).toBe(
      'Race calendar',
    );
  });

  it('finds a destination by a word that is not in its label', () => {
    const commands = buildCommands(NEXT_RACE, { signedIn: true });

    expect(filterCommands(commands, 'standings').map((c) => c.href)).toContain(
      '/leaderboard',
    );
    expect(filterCommands(commands, 'timezone').map((c) => c.href)).toContain(
      '/settings',
    );
  });

  it('returns nothing rather than everything for a query that matches nothing', () => {
    expect(
      filterCommands(buildCommands(NEXT_RACE, { signedIn: true }), 'zzzz'),
    ).toEqual([]);
  });

  it('keeps manifest order inside a rank so the list does not reshuffle', () => {
    const commands: PaletteCommand[] = [
      { id: 'b', label: 'Alpha two', group: 'Go to', href: '/b' },
      { id: 'a', label: 'Alpha one', group: 'Go to', href: '/a' },
    ];

    expect(filterCommands(commands, 'alpha').map((c) => c.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('offers the weekend write-ups, so the palette cannot go stale', () => {
    const hrefs = buildCommands(NEXT_RACE, SIGNED_IN).map(
      (command) => command.href,
    );

    expect(hrefs).toContain('/f1-2026-madrid-grand-prix-predictions');
    expect(
      buildCommands(NEXT_RACE, SIGNED_IN).filter(
        (command) => command.group === 'Write-ups',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('withholds viewer-scoped destinations from a signed-out visitor', () => {
    const hrefs = buildCommands(NEXT_RACE, SIGNED_OUT).map(
      (command) => command.href,
    );

    for (const gated of [
      '/settings',
      '/notifications',
      '/me',
      '/feed',
      '/leagues/create',
    ]) {
      expect(hrefs).not.toContain(gated);
    }
  });

  it('keeps the public site, and the pick, for a signed-out visitor', () => {
    const hrefs = buildCommands(NEXT_RACE, SIGNED_OUT).map(
      (command) => command.href,
    );

    // The race page renders for logged-out visitors and takes a pick before
    // asking for an account, so it is a real destination rather than a wall.
    expect(hrefs).toContain('/races/singapore-2026');
    expect(hrefs).toContain('/leaderboard');
    expect(hrefs).toContain('/races');
    expect(hrefs).toContain('/f1-2026-madrid-grand-prix-predictions');
  });

  it('groups in a fixed order and omits groups with no matches', () => {
    const sections = groupCommands(
      filterCommands(buildCommands(NEXT_RACE, { signedIn: true }), 'league'),
    );

    expect(sections.map((section) => section.group)).toEqual(['Go to']);
  });

  it('puts picks above destinations when both match', () => {
    const sections = groupCommands(
      filterCommands(buildCommands(NEXT_RACE, { signedIn: true }), 'p'),
    );

    expect(sections[0]?.group).toBe('Picks');
  });
});
