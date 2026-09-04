import { describe, expect, it, vi } from 'vitest';

import type { Id } from './_generated/dataModel';
import { markSignupReported } from './users';

function userId(id: string): Id<'users'> {
  return id as Id<'users'>;
}

const HOUR = 60 * 60 * 1000;

describe('markSignupReported', () => {
  function ctx() {
    const patch = vi.fn().mockResolvedValue(undefined);
    return { ctx: { db: { patch } } as never, patch };
  }

  it('reports an account created moments ago, and stamps it', async () => {
    const { ctx: fake, patch } = ctx();
    const now = Date.now();

    await expect(
      markSignupReported(
        fake,
        { _id: userId('u1'), createdAt: now - 2000 },
        now,
      ),
    ).resolves.toBe(true);
    expect(patch).toHaveBeenCalledWith(userId('u1'), {
      signupReportedAt: now,
    });
  });

  // The funnel step has to be reportable once. A reload, a second tab or a
  // new device all run this again for the same account.
  it('reports nothing the second time, however new the account is', async () => {
    const { ctx: fake, patch } = ctx();
    const now = Date.now();

    await expect(
      markSignupReported(
        fake,
        { _id: userId('u1'), createdAt: now - 2000, signupReportedAt: now - 1 },
        now,
      ),
    ).resolves.toBe(false);
    expect(patch).not.toHaveBeenCalled();
  });

  // Every account that predates the field arrives here unstamped. Reporting
  // those would land a season's worth of players in the funnel on the day
  // this shipped, which is why age decides and the stamp only de-duplicates.
  it('stamps an older account silently rather than calling it a signup', async () => {
    const { ctx: fake, patch } = ctx();
    const now = Date.now();

    await expect(
      markSignupReported(
        fake,
        { _id: userId('u1'), createdAt: now - 2 * HOUR },
        now,
      ),
    ).resolves.toBe(false);
    expect(patch).toHaveBeenCalledWith(userId('u1'), {
      signupReportedAt: now,
    });
  });
});
