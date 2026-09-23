import { describe, expect, it } from 'vitest';

import handler from './weekend.get';

describe('TRMNL polling query', () => {
  it.each([
    '?tz=UTC&locale=en-GB&cache_buster=1',
    '?tz=UTC&tz=Europe%2FLondon',
    '?tz=Not%2FAZone',
    '?locale=not_a_locale',
  ])('rejects %s before reading the backend', async (query) => {
    const response = await handler({
      req: new Request(`https://grandprixpicks.com/api/trmnl/weekend${query}`),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: 'invalid_query' });
  });
});
