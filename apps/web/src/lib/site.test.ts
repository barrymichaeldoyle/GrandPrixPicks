import { describe, expect, it } from 'vitest';

import { canonicalMeta, defaultOgImage, noIndexMeta, siteConfig } from './site';

describe('site config', () => {
  it('builds canonical metadata from route path', () => {
    const result = canonicalMeta('/pricing');
    expect(result).toEqual({
      meta: [
        { property: 'og:url', content: `${siteConfig.url}/pricing` },
        { name: 'twitter:url', content: `${siteConfig.url}/pricing` },
      ],
      links: [{ rel: 'canonical', href: `${siteConfig.url}/pricing` }],
    });
  });

  it('exports a default og image URL', () => {
    expect(defaultOgImage).toContain('/og-default.png?v=');
  });

  it('exports noindex metadata for gated pages', () => {
    expect(noIndexMeta()).toEqual([
      { name: 'robots', content: 'noindex, follow' },
    ]);
  });
});
