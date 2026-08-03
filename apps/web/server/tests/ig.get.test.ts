import { describe, expect, it } from 'vitest';

import handler from '../routes/ig.get';

describe('/ig route', () => {
  it('redirects to the Instagram profile campaign landing URL', () => {
    const response = handler();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/?utm_source=instagram&utm_medium=social&utm_campaign=profile',
    );
  });
});
