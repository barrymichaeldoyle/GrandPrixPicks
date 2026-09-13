import { SaxesParser } from 'saxes';

export type RssItem = {
  externalId: string;
  canonicalUrl: string;
  title: string;
  excerpt: string;
  sourcePublishedAt?: number;
};

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|source$)/i;
const PRIVATE_HOST =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|0\.|::1|\[)/i;

export function safeHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      PRIVATE_HOST.test(url.hostname)
    ) {
      return null;
    }
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function canonicalNewsUrl(
  raw: string,
  sourceHost: string,
): string | null {
  const url = safeHttpUrl(raw);
  if (
    !url ||
    (url.hostname !== sourceHost && !url.hostname.endsWith(`.${sourceHost}`))
  ) {
    return null;
  }
  for (const key of url.searchParams.keys()) {
    if (TRACKING.test(key)) {
      url.searchParams.delete(key);
    }
  }
  return url.toString().split('#')[0];
}

function plain(raw: string, max: number): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function parseRss(xml: string, sourceHost: string): RssItem[] {
  if (
    new TextEncoder().encode(xml).length > 128_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml)
  ) {
    throw new Error('Feed is too large or contains a DTD.');
  }
  const parser = new SaxesParser();
  const result: RssItem[] = [];
  let item: Record<string, string> | null = null;
  let text = '';
  parser.on('opentag', (tag) => {
    const name = tag.name.toLowerCase();
    text = '';
    if (name === 'item' || name === 'entry') {
      item = {};
    }
    if (item && name === 'link' && typeof tag.attributes.href === 'string') {
      item.link = tag.attributes.href;
    }
  });
  parser.on('text', (value) => {
    text += value.slice(0, 4000);
  });
  parser.on('cdata', (value) => {
    text += value.slice(0, 4000);
  });
  parser.on('closetag', (tag) => {
    const name = tag.name.toLowerCase();
    if (
      item &&
      [
        'title',
        'link',
        'guid',
        'id',
        'description',
        'summary',
        'pubdate',
        'published',
        'updated',
      ].includes(name)
    ) {
      item[name] = (item[name] ?? '') + text;
    }
    if (item && (name === 'item' || name === 'entry')) {
      const canonicalUrl = canonicalNewsUrl(item.link ?? '', sourceHost);
      const title = plain(item.title ?? '', 180);
      if (canonicalUrl && title && result.length < 30) {
        const date = Date.parse(
          item.pubdate ?? item.published ?? item.updated ?? '',
        );
        result.push({
          externalId: plain(item.guid ?? item.id ?? canonicalUrl, 500),
          canonicalUrl,
          title,
          excerpt: plain(item.description ?? item.summary ?? '', 500),
          ...(Number.isFinite(date) ? { sourcePublishedAt: date } : {}),
        });
      }
      item = null;
    }
    text = '';
  });
  parser.on('error', (error) => {
    throw error;
  });
  parser.write(xml).close();
  return result;
}
