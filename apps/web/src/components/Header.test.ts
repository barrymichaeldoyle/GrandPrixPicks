import { describe, expect, it } from 'vitest';

import {
  MOBILE_NAV_LINK_ACTIVE_CLASS,
  MOBILE_NAV_LINK_CLASS,
  NAV_LINK_ACTIVE_CLASS,
  NAV_LINK_CLASS,
} from './Header';

describe('Header navigation layout', () => {
  it('keeps active and inactive link padding identical', () => {
    expect(NAV_LINK_CLASS).toContain('px-3 py-1.5');
    expect(NAV_LINK_ACTIVE_CLASS).toContain('px-3 py-1.5');
    expect(NAV_LINK_ACTIVE_CLASS).not.toMatch(/\b(?:pl|pr)-/);

    expect(MOBILE_NAV_LINK_CLASS).toContain('px-3 py-2');
    expect(MOBILE_NAV_LINK_ACTIVE_CLASS).toContain('px-3 py-2');
    expect(MOBILE_NAV_LINK_ACTIVE_CLASS).not.toMatch(/\b(?:pl|pr)-/);
  });
});
