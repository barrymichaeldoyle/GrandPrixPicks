import { describe, expect, it } from 'vitest';

import { trailingSlashRedirect } from './trailingSlash';

// Concatenated, not `new URL(path, base)`: that reads `//example.com/` as a
// host, where the request URL the server sees keeps it as the path.
function at(path: string) {
  return trailingSlashRedirect(new URL(`https://grandprixpicks.com${path}`));
}

describe('trailingSlashRedirect', () => {
  it('strips the slash from a page URL and keeps the query', () => {
    expect(at('/how-to-play/')).toBe('/how-to-play');
    expect(at('/races/japan-2026//?session=race')).toBe(
      '/races/japan-2026?session=race',
    );
  });

  it('leaves the root, slashless paths and machine routes alone', () => {
    expect(at('/')).toBeNull();
    expect(at('/how-to-play')).toBeNull();
    expect(at('/api/news/recent/')).toBeNull();
    expect(at('/og/next/')).toBeNull();
  });

  it('never builds a protocol-relative redirect', () => {
    expect(at('//example.com/')).toBeNull();
  });
});
