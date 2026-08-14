import { describe, expect, it } from 'vitest';

import { sanitizeInternalPath } from './internalPath';

describe('sanitizeInternalPath', () => {
  it('keeps ordinary internal paths', () => {
    expect(sanitizeInternalPath('/results-policy')).toBe('/results-policy');
    expect(sanitizeInternalPath('/races/monaco?from=/feed#top')).toBe(
      '/races/monaco?from=/feed#top',
    );
  });

  it('rejects anything that can leave the origin', () => {
    for (const value of [
      '//evil.com',
      '/\\evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      'results-policy',
      '/\tevil',
      '/\n//evil.com',
      ' //evil.com',
      '',
    ]) {
      expect(sanitizeInternalPath(value)).toBeUndefined();
    }
  });

  it('rejects non-strings', () => {
    expect(sanitizeInternalPath(undefined)).toBeUndefined();
    expect(sanitizeInternalPath(null)).toBeUndefined();
    expect(sanitizeInternalPath(42)).toBeUndefined();
  });
});
