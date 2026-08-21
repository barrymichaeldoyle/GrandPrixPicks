import { describe, expect, it } from 'vitest';

import { showsGlobalFooter } from './globalFooter';

describe('showsGlobalFooter', () => {
  it('hands the small print to the rail on the signed-in dashboard', () => {
    expect(showsGlobalFooter('/', true)).toBe(false);
  });

  it('keeps the full footer on the logged-out landing page', () => {
    // Signed out, `/` is the marketing page: it ends, and it has no rail.
    expect(showsGlobalFooter('/', false)).toBe(true);
  });

  it.each(['/leaderboard', '/notifications', '/leagues', '/races'])(
    'keeps the full footer on %s',
    (pathname) => {
      expect(showsGlobalFooter(pathname, true)).toBe(true);
      expect(showsGlobalFooter(pathname, false)).toBe(true);
    },
  );

  it('never lets both footers show at once', () => {
    // The rail is the complement of this function, so agreement is the
    // property that matters: exactly one footer per page, always.
    for (const pathname of ['/', '/leaderboard', '/leagues']) {
      for (const isSignedIn of [true, false]) {
        const global = showsGlobalFooter(pathname, isSignedIn);
        const rail = !global;
        expect(global && rail).toBe(false);
        expect(global || rail).toBe(true);
      }
    }
  });
});
