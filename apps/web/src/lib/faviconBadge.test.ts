import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  FAVICON_ARTWORK,
  PLAIN_FAVICON_HREF,
  UNREAD_FAVICON_HREF,
} from './faviconBadge';

/** Shape-for-shape comparison, indifferent to how the source is wrapped. */
function shapes(svg: string): string {
  return svg
    .replace(/<svg[^>]*>|<\/svg>/g, '')
    .replace(/\s*(role|aria-label)="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function decode(href: string): string {
  return decodeURIComponent(href.replace('data:image/svg+xml,', ''));
}

describe('faviconBadge', () => {
  it('draws the same mark as public/favicon.svg', () => {
    // Vitest runs from apps/web; `import.meta.url` is a transformed module
    // URL here, not a file one.
    const file = readFileSync(resolve('public/favicon.svg'), 'utf8');

    // The badged icon must be the app's icon with a dot on it. If the file is
    // redrawn and this copy is not, the tab shows a different logo the moment
    // something goes unread.
    expect(shapes(FAVICON_ARTWORK)).toBe(shapes(file));
  });

  it('renders the plain mark with nothing added', () => {
    expect(shapes(decode(PLAIN_FAVICON_HREF))).toBe(shapes(FAVICON_ARTWORK));
  });

  it('adds the dot on top of the mark, not behind it', () => {
    const badged = shapes(decode(UNREAD_FAVICON_HREF));

    expect(badged.startsWith(shapes(FAVICON_ARTWORK))).toBe(true);
    expect(badged).toContain('circle');
  });

  it('produces hrefs a link element can use verbatim', () => {
    for (const href of [PLAIN_FAVICON_HREF, UNREAD_FAVICON_HREF]) {
      expect(href.startsWith('data:image/svg+xml,')).toBe(true);
      // Unescaped '#' would terminate the URL at the first colour.
      expect(href).not.toContain('#');
    }
  });
});
