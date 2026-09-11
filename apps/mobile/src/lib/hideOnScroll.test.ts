import { describe, expect, it } from 'vitest';

import {
  nextHideOffset,
  snapHideOffset,
  TAB_CHROME_HEIGHT,
} from './hideOnScroll';

describe('nextHideOffset', () => {
  it('stays shown at the top of the list', () => {
    expect(
      nextHideOffset({ y: 0, dy: 20, current: 10, height: TAB_CHROME_HEIGHT }),
    ).toBe(0);
    expect(
      nextHideOffset({ y: 8, dy: 40, current: 44, height: TAB_CHROME_HEIGHT }),
    ).toBe(0);
  });

  it('follows a downward scroll', () => {
    expect(
      nextHideOffset({ y: 30, dy: 12, current: 0, height: TAB_CHROME_HEIGHT }),
    ).toBe(12);
  });

  it('follows an upward scroll back toward shown', () => {
    expect(
      nextHideOffset({
        y: 40,
        dy: -10,
        current: 20,
        height: TAB_CHROME_HEIGHT,
      }),
    ).toBe(10);
  });

  it('clamps to the chrome height', () => {
    expect(
      nextHideOffset({ y: 80, dy: 30, current: 40, height: TAB_CHROME_HEIGHT }),
    ).toBe(TAB_CHROME_HEIGHT);
    expect(
      nextHideOffset({
        y: 80,
        dy: -50,
        current: 10,
        height: TAB_CHROME_HEIGHT,
      }),
    ).toBe(0);
  });
});

describe('snapHideOffset', () => {
  it('snaps hidden past halfway', () => {
    expect(snapHideOffset(23)).toBe(TAB_CHROME_HEIGHT);
  });

  it('snaps shown at halfway or below', () => {
    expect(snapHideOffset(22)).toBe(0);
    expect(snapHideOffset(0)).toBe(0);
  });
});
