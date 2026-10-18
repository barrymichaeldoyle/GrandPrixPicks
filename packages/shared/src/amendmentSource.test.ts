import { describe, expect, it } from 'vitest';

import { parseAmendmentSourceUrl } from './amendmentSource';

describe('parseAmendmentSourceUrl', () => {
  it('keeps FIA decision document links', () => {
    const pdf =
      'https://www.fia.com/system/files/decision-document/2026_singapore_grand_prix_-_infringement_-_car_18.pdf';
    expect(parseAmendmentSourceUrl(pdf)).toBe(pdf);
    expect(parseAmendmentSourceUrl(`  ${pdf}\n`)).toBe(pdf);
    expect(parseAmendmentSourceUrl('https://fia.com/documents')).toBe(
      'https://fia.com/documents',
    );
  });

  it('rejects anything that is not an https fia.com link', () => {
    for (const value of [
      'http://www.fia.com/system/files/decision.pdf',
      'https://fia.com.evil.com/decision.pdf',
      'https://evilfia.com/decision.pdf',
      'https://www.fia.com@evil.com/decision.pdf',
      'https://www.fia.com:8443/decision.pdf',
      'https://www.fia.com\\@evil.com/decision.pdf',
      'https://www.fia.com/decision pdf',
      'https://user:pass@www.fia.com/decision.pdf',
      'javascript:alert(1)',
      '/results-policy',
      'www.fia.com/decision.pdf',
      '',
    ]) {
      expect(parseAmendmentSourceUrl(value)).toBeUndefined();
    }
  });

  it('rejects non-strings', () => {
    expect(parseAmendmentSourceUrl(undefined)).toBeUndefined();
    expect(parseAmendmentSourceUrl(42)).toBeUndefined();
  });
});
