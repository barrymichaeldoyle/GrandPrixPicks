import { describe, expect, it } from 'vitest';

import { deriveSubject } from './support';

describe('deriveSubject', () => {
  it('uses the whole message when it is one short line', () => {
    expect(deriveSubject('The leaderboard should be sortable')).toBe(
      'The leaderboard should be sortable',
    );
  });

  it('takes only the first line of a longer message', () => {
    expect(
      deriveSubject('Sprint quali is missing\n\nIt was there last weekend.'),
    ).toBe('Sprint quali is missing');
  });

  it('truncates a long first line rather than overflowing the subject', () => {
    const subject = deriveSubject('word '.repeat(40));

    expect(subject.length).toBeLessThanOrEqual(80);
    expect(subject.endsWith('…')).toBe(true);
  });

  it('falls back to the message when the first line is blank', () => {
    expect(deriveSubject('\n\nH2H picks did not save')).toBe(
      'H2H picks did not save',
    );
  });
});
