import { describe, expect, it } from 'vitest';

import igHandler from '../routes/ig.get';
import handler from '../routes/instagram.get';

describe('/instagram route', () => {
  it('redirects to the Instagram profile campaign landing URL', () => {
    const response = handler();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/?utm_source=instagram&utm_medium=social&utm_campaign=profile',
    );
  });

  it('attributes identically to /ig', () => {
    expect(handler().headers.get('location')).toBe(
      igHandler().headers.get('location'),
    );
  });
});
