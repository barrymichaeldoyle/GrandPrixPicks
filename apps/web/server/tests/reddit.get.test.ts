import { describe, expect, it } from 'vitest';

import handler from '../routes/reddit.get';

describe('/reddit route', () => {
  it('redirects to the Reddit community campaign landing URL', () => {
    const response = handler();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/?utm_source=reddit&utm_medium=social&utm_campaign=community',
    );
  });
});
