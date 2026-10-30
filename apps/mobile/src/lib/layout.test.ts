import { describe, expect, it } from 'vitest';

import { layoutClassForWidth } from './layout';

describe('layoutClassForWidth', () => {
  it('keeps every phone compact, including the largest', () => {
    expect(layoutClassForWidth(375)).toBe('compact');
    expect(layoutClassForWidth(440)).toBe('compact');
  });

  it('gives one column to the Duo inner display upright and iPads in portrait', () => {
    expect(layoutClassForWidth(626)).toBe('medium');
    expect(layoutClassForWidth(744)).toBe('medium');
    expect(layoutClassForWidth(834)).toBe('medium');
  });

  it('gives two columns from 840 up', () => {
    expect(layoutClassForWidth(840)).toBe('expanded');
    expect(layoutClassForWidth(1032)).toBe('expanded');
    expect(layoutClassForWidth(1376)).toBe('expanded');
  });
});
