import { describe, expect, it } from 'vitest';

import redditHandler from '../routes/reddit.get';
import handler from '../routes/r.get';

describe('/r route', () => {
  it('redirects to the Reddit community campaign landing URL', () => {
    const response = handler();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/?utm_source=reddit&utm_medium=social&utm_campaign=community',
    );
  });

  it('attributes identically to /reddit', () => {
    // Two spellings of one link. If these ever diverge, Reddit traffic splits
    // across two campaign values and neither reports the real number.
    expect(handler().headers.get('location')).toBe(
      redditHandler().headers.get('location'),
    );
  });
});
