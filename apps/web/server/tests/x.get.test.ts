import { describe, expect, it } from 'vitest';

import handler from '../routes/x.get';

describe('/x route', () => {
  it('redirects to the X profile campaign landing URL', () => {
    const response = handler();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/?utm_source=x&utm_medium=social&utm_campaign=profile',
    );
  });
});
