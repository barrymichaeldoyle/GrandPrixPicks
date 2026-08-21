import { describe, expect, it } from 'vitest';

import { stripUnreadTitlePrefix, unreadTitlePrefix } from './unreadTitle';

describe('unreadTitlePrefix', () => {
  it('says nothing when there is nothing unread', () => {
    expect(unreadTitlePrefix(0, false)).toBe('');
  });

  it('counts', () => {
    expect(unreadTitlePrefix(1, false)).toBe('(1) ');
    expect(unreadTitlePrefix(12, false)).toBe('(12) ');
  });

  it('does not claim a number nobody counted', () => {
    expect(unreadTitlePrefix(99, true)).toBe('(99+) ');
  });
});

describe('stripUnreadTitlePrefix', () => {
  it('removes a prefix it wrote', () => {
    expect(stripUnreadTitlePrefix('(3) Grand Prix Picks')).toBe(
      'Grand Prix Picks',
    );
    expect(stripUnreadTitlePrefix('(99+) Grand Prix Picks')).toBe(
      'Grand Prix Picks',
    );
  });

  it('leaves a title that merely starts with a bracket alone', () => {
    expect(stripUnreadTitlePrefix('(Sprint) Miami GP')).toBe(
      '(Sprint) Miami GP',
    );
  });

  it('is idempotent, so a fast-changing count cannot stack prefixes', () => {
    const once =
      unreadTitlePrefix(2, false) +
      stripUnreadTitlePrefix('(1) Grand Prix Picks');
    expect(once).toBe('(2) Grand Prix Picks');
    expect(stripUnreadTitlePrefix(stripUnreadTitlePrefix(once))).toBe(
      'Grand Prix Picks',
    );
  });
});
