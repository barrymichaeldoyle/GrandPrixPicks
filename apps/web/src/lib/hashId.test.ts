import { describe, expect, it } from 'vitest';

import { hashId } from './hashId';

describe('hashId', () => {
  it('decodes the id a hash names', () => {
    expect(hashId('#news-ver%C3%B3n')).toBe('news-verón');
    expect(hashId('news-1')).toBe('news-1');
    expect(hashId('')).toBe('');
  });

  it('returns nothing for a hash that is not valid percent-encoding', () => {
    // A mangled share link. `decodeURIComponent` throws on these, and thrown
    // from a mount effect that took the whole write-up to the error screen.
    expect(hashId('#%')).toBe('');
    expect(hashId('#news-%E0')).toBe('');
  });
});
