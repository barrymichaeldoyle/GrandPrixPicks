import { describe, expect, it } from 'vitest';

import { isClerkFreeRoute } from './clerk-free-routes';

describe('isClerkFreeRoute', () => {
  it('covers the public content routes', () => {
    for (const path of [
      '/',
      '/races',
      '/races/monaco-2026',
      '/races/monaco-2026/practice',
      '/f1-standings',
      '/f1-2027-calendar',
      '/f1-team-mate-battles',
      '/guides',
      '/guides/f1-points-system-explained',
      '/how-to-play',
      '/about',
      '/leaderboard',
      '/terms',
      '/privacy',
      '/refund-policy',
      '/results-policy',
    ]) {
      expect(isClerkFreeRoute(path), path).toBe(true);
    }
  });

  it('covers the sign-in surfaces that go through requestSignIn', () => {
    // These four asked for a provider until SignInActionButton replaced Clerk's
    // own SignInButton on them. Prompting for sign-in is not the same as
    // mounting Clerk.
    for (const path of ['/pricing', '/support', '/leagues', '/sign-in']) {
      expect(isClerkFreeRoute(path), path).toBe(true);
    }
  });

  it('keeps Clerk on viewer-scoped routes', () => {
    for (const path of [
      '/feed',
      '/settings',
      '/me',
      '/p/barrymichaeldoyle',
      '/admin',
      '/pay',
      // The index is public; everything under it is viewer-scoped.
      '/leagues/create',
      '/leagues/some-league',
    ]) {
      expect(isClerkFreeRoute(path), path).toBe(false);
    }
  });

  it('normalises trailing slashes and casing', () => {
    expect(isClerkFreeRoute('/races/')).toBe(true);
    expect(isClerkFreeRoute('/F1-Standings')).toBe(true);
    expect(isClerkFreeRoute('/Races/Monaco-2026')).toBe(true);
  });

  it('does not let a prefix leak past its subtree', () => {
    // "/races" must not make "/racesomething" Clerk-free.
    expect(isClerkFreeRoute('/racesomething')).toBe(false);
    expect(isClerkFreeRoute('/guidesomething')).toBe(false);
  });
});
