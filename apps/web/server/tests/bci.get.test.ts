import { describe, expect, it } from 'vitest';

import handler from '../routes/bci.get';

const BASE =
  '/?utm_source=bci&utm_medium=sponsorship&utm_campaign=bci-conference-2026';

function locationFor(url: string) {
  const response = handler({ req: new Request(url) });
  expect(response.status).toBe(302);
  return response.headers.get('location');
}

describe('/bci route', () => {
  it('redirects to the landing page with the conference campaign attached', () => {
    expect(locationFor('https://grandprixpicks.com/bci')).toBe(BASE);
  });

  it('does not claim to be social traffic', () => {
    // The social campaigns are compared against each other; a sponsorship
    // filed under the same medium would quietly inflate every one of them.
    expect(locationFor('https://grandprixpicks.com/bci')).not.toContain(
      'utm_medium=social',
    );
  });

  it('carries a placement label through to the campaign URL', () => {
    expect(locationFor('https://grandprixpicks.com/bci?utm_content=app')).toBe(
      `${BASE}&utm_content=app`,
    );
  });

  it('keeps the placement out of the campaign, so placements still roll up', () => {
    const location = locationFor(
      'https://grandprixpicks.com/bci?utm_content=badge',
    );

    expect(location).toContain('utm_campaign=bci-conference-2026&');
    expect(location).toContain('utm_content=badge');
  });

  it('drops a placement that is not a plain slug', () => {
    // The value is attacker-editable and lands in an analytics dimension, so
    // anything unusual is dropped rather than escaped and reported.
    for (const bad of [
      'App',
      'a b',
      'x'.repeat(33),
      '../../evil',
      'a&utm_campaign=hijacked',
      '',
    ]) {
      const location = locationFor(
        `https://grandprixpicks.com/bci?utm_content=${encodeURIComponent(bad)}`,
      );

      expect(location).toBe(BASE);
    }
  });

  it('still delivers the visitor when the placement is junk', () => {
    expect(
      locationFor('https://grandprixpicks.com/bci?utm_content=%F0%9F%8F%81'),
    ).toBe(BASE);
  });

  it('ignores query params other than the placement', () => {
    expect(
      locationFor(
        'https://grandprixpicks.com/bci?utm_source=spoofed&fbclid=123',
      ),
    ).toBe(BASE);
  });
});
