import { describe, expect, it } from 'vitest';

import { gdprApplies } from '../lib/consentRegion';
import handler from '../routes/api/consent-region.get';

async function regionFor(headers: Record<string, string>) {
  const response = handler({
    req: new Request('https://grandprixpicks.com/api/consent-region', {
      headers,
    }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return (await response.json()) as { gdpr: boolean };
}

describe('gdprApplies', () => {
  it.each(['DE', 'fr', 'GB', 'CH', 'NO', 'IS', 'IE'])('is true for %s', (c) => {
    expect(gdprApplies(c)).toBe(true);
  });

  it.each(['ZA', 'US', 'CA', 'AU', 'NZ', 'SG', 'UA', 'CN'])(
    'is false for %s',
    (c) => {
      expect(gdprApplies(c)).toBe(false);
    },
  );

  it('treats unknown, Tor and a missing header as in scope', () => {
    expect(gdprApplies('XX')).toBe(true);
    expect(gdprApplies('T1')).toBe(true);
    expect(gdprApplies(null)).toBe(true);
    expect(gdprApplies('')).toBe(true);
  });
});

describe('/api/consent-region route', () => {
  it('answers from the Cloudflare country header and never caches', async () => {
    expect(await regionFor({ 'cf-ipcountry': 'ZA' })).toEqual({ gdpr: false });
    expect(await regionFor({ 'cf-ipcountry': 'NL' })).toEqual({ gdpr: true });
    expect(await regionFor({})).toEqual({ gdpr: true });
  });
});
