import { describe, expect, it } from 'vitest';

import { countAdmins } from './leagues';

describe('countAdmins', () => {
  it('counts only admin members', () => {
    expect(
      countAdmins([
        { role: 'admin' },
        { role: 'member' },
        { role: 'admin' },
      ]),
    ).toBe(2);
  });

  it('returns zero when there are no admins', () => {
    expect(
      countAdmins([
        { role: 'member' },
        { role: 'member' },
      ]),
    ).toBe(0);
  });

  it('returns zero for an empty league', () => {
    expect(countAdmins([])).toBe(0);
  });
});
