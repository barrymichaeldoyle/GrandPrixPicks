import { describe, expect, it } from 'vitest';
import { canonicalNewsUrl, parseRss, safeHttpUrl } from './newsRss';

describe('approved RSS adapter', () => {
  it('drops tracking parameters but preserves distinct sources', () => {
    expect(
      canonicalNewsUrl(
        'https://example.com/story?utm_source=x&edition=uk#top',
        'example.com',
      ),
    ).toBe('https://example.com/story?edition=uk');
    expect(
      canonicalNewsUrl('https://other.com/story', 'example.com'),
    ).toBeNull();
    expect(safeHttpUrl('http://127.0.0.1/feed')).toBeNull();
  });
  it('extracts bounded items and rejects DTDs and oversized feeds', () => {
    const xml =
      '<rss><channel><item><title>A title</title><link>https://example.com/a?utm_source=rss</link><guid>a-1</guid><description><![CDATA[<b>A short summary</b>]]></description></item></channel></rss>';
    expect(parseRss(xml, 'example.com')).toEqual([
      {
        externalId: 'a-1',
        canonicalUrl: 'https://example.com/a',
        title: 'A title',
        excerpt: 'A short summary',
      },
    ]);
    expect(() =>
      parseRss('<!DOCTYPE rss [<!ENTITY x "attack">]><rss/>', 'example.com'),
    ).toThrow(/DTD/);
    expect(() => parseRss('x'.repeat(128_001), 'example.com')).toThrow(
      /too large/,
    );
  });
  it('keeps same-title entries with distinct source links', () => {
    const xml =
      '<rss><channel><item><title>Team update</title><link>https://example.com/one</link></item><item><title>Team update</title><link>https://example.com/two</link></item></channel></rss>';
    expect(
      parseRss(xml, 'example.com').map((item) => item.canonicalUrl),
    ).toEqual(['https://example.com/one', 'https://example.com/two']);
  });
});
