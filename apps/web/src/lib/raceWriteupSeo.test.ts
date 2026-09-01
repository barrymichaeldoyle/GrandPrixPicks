import { describe, expect, it } from 'vitest';

import {
  HOME_PICKS_HASH,
  isRacePageDeepLink,
  predictionsThisWeekendRedirectTarget,
  racePageWriteupHeadOptions,
  racePageWriteupRedirectTarget,
  raceSlugsWithWriteups,
  raceWriteupPrimaryLink,
} from './raceWriteupSeo';

describe('raceWriteupSeo', () => {
  it('lists every registry slug as having a write-up', () => {
    expect(raceSlugsWithWriteups()).toEqual(
      expect.arrayContaining([
        'italy-2026',
        'bahrain-2026',
        'singapore-2026',
        'azerbaijan-2026',
        'madrid-2026',
      ]),
    );
  });

  it('treats session and share-card params as deep links', () => {
    expect(isRacePageDeepLink({ session: 'quali' })).toBe(true);
    expect(isRacePageDeepLink({ share: 'picks', picks: 'abc' })).toBe(true);
    expect(isRacePageDeepLink({})).toBe(false);
  });

  it('301-targets bare race pages that have write-ups', () => {
    expect(racePageWriteupRedirectTarget('italy-2026', {})).toBe(
      '/f1-2026-italian-grand-prix-predictions',
    );
    expect(
      racePageWriteupRedirectTarget('italy-2026', { session: 'race' }),
    ).toBeNull();
    expect(racePageWriteupRedirectTarget('miami-2026', {})).toBeNull();
  });

  it('canonicalises deep-linked race pages to the write-up with noindex', () => {
    expect(racePageWriteupHeadOptions('italy-2026')).toEqual({
      canonicalPath: '/f1-2026-italian-grand-prix-predictions',
      noIndex: true,
    });
    expect(racePageWriteupHeadOptions('miami-2026')).toBeNull();
  });

  it('redirects predictions-this-weekend to the current race write-up', () => {
    expect(predictionsThisWeekendRedirectTarget('italy-2026')).toBe(
      '/f1-2026-italian-grand-prix-predictions',
    );
    expect(predictionsThisWeekendRedirectTarget('mexico-2026')).toBeNull();
  });

  it('sends pick CTAs to the homepage picker and results to the race page', () => {
    expect(raceWriteupPrimaryLink('preview', 'italy-2026')).toEqual({
      to: '/',
      hash: HOME_PICKS_HASH,
    });
    expect(raceWriteupPrimaryLink('finished', 'italy-2026')).toEqual({
      to: '/races/$raceSlug',
      params: { raceSlug: 'italy-2026' },
    });
  });
});
