import { describe, expect, it } from 'vitest';

import { F1_STORE_PAGES, F1_STORE_TRACKING_URL } from '../lib/f1Store';
import handler from '../routes/go/f1-store.get';

function redirectFor(headers: Record<string, string>, query = '') {
  const response = handler({
    req: new Request(`https://grandprixpicks.com/go/f1-store${query}`, {
      headers,
    }),
  });
  expect(response.status).toBe(302);
  return new URL(response.headers.get('location')!);
}

function landingFor(headers: Record<string, string>) {
  const location = redirectFor(headers);
  expect(`${location.origin}${location.pathname}`).toBe(F1_STORE_TRACKING_URL);
  return location.searchParams.get('u');
}

describe('/go/f1-store route', () => {
  it('sends South Africa to the international shop, not the EU one', () => {
    expect(
      landingFor({ 'cf-ipcountry': 'ZA', 'accept-language': 'en-ZA,en;q=0.9' }),
    ).toBe('https://f1store4.formula1.com/en/');
  });

  it.each([
    ['GB', 'https://f1store.formula1.com/en/'],
    ['IE', 'https://f1store2.formula1.com/en/'],
    ['AU', 'https://f1store3.formula1.com/en/'],
    ['NZ', 'https://f1store3.formula1.com/en/'],
    ['US', 'https://usf1store.formula1.com/en/'],
    ['CA', 'https://f1store4.formula1.com/en/'],
  ])('sends %s to its regional shop', (country, shop) => {
    expect(
      landingFor({ 'cf-ipcountry': country, 'accept-language': 'en-GB' }),
    ).toBe(shop);
  });

  it('opens the shop in the browser language when the shop has it', () => {
    expect(
      landingFor({ 'cf-ipcountry': 'FR', 'accept-language': 'fr-FR,fr;q=0.9' }),
    ).toBe('https://f1store2.formula1.com/fr/');
    expect(
      landingFor({ 'cf-ipcountry': 'MX', 'accept-language': 'es-MX,es' }),
    ).toBe('https://f1store4.formula1.com/es/');
  });

  it('falls back to English when the shop lacks the browser language', () => {
    expect(
      landingFor({ 'cf-ipcountry': 'NL', 'accept-language': 'nl-NL,nl' }),
    ).toBe('https://f1store2.formula1.com/en/');
  });

  it('sends an unknown country to the international shop', () => {
    expect(landingFor({})).toBe('https://f1store4.formula1.com/en/');
    expect(landingFor({ 'cf-ipcountry': 'XX' })).toBe(
      'https://f1store4.formula1.com/en/',
    );
  });

  it('is never cached, because the answer depends on the visitor', () => {
    const response = handler({
      req: new Request('https://grandprixpicks.com/go/f1-store'),
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it("sends a driver page link to that page in the visitor's shop, under its own ad", () => {
    const location = redirectFor(
      { 'cf-ipcountry': 'ZA', 'accept-language': 'en-ZA' },
      '?page=esteban-ocon',
    );
    expect(`${location.origin}${location.pathname}`).toBe(
      F1_STORE_PAGES['esteban-ocon'].trackingUrl,
    );
    expect(location.searchParams.get('u')).toBe(
      'https://f1store4.formula1.com/en/esteban-ocon/a-2384886157+z-977991-74467561',
    );
  });

  it('never forwards a page that is not on the allowlist', () => {
    for (const page of [
      '../../evil',
      'constructor',
      '__proto__',
      'https://x',
    ]) {
      const location = redirectFor(
        { 'cf-ipcountry': 'GB' },
        `?page=${encodeURIComponent(page)}`,
      );
      expect(`${location.origin}${location.pathname}`).toBe(
        F1_STORE_TRACKING_URL,
      );
      expect(location.searchParams.get('u')).toBe(
        'https://f1store.formula1.com/en/',
      );
    }
  });
});
