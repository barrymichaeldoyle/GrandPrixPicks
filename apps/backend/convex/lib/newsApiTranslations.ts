import {
  NEWS_TRANSLATION_LANGUAGES,
  type NewsTranslationLanguage,
} from '@grandprixpicks/shared/newsLanguages';

import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

/**
 * Which English a translation was made from: the SHA-256 of the headline and
 * body. A translation is served only while this matches the story's current
 * text, so a corrected story reads in English until it is translated again.
 */
export async function translationSourceHash(
  headline: string,
  body: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify([headline, body])),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * A story's translations that match its current English (`sourceHash`), by
 * language. Stale rows are left out: they are never served.
 */
export async function currentTranslations(
  ctx: QueryCtx,
  newsId: string,
  sourceHash: string,
): Promise<Map<NewsTranslationLanguage, Doc<'newsApiTranslations'>>> {
  const rows = await ctx.db
    .query('newsApiTranslations')
    .withIndex('by_news_language', (q) => q.eq('newsId', newsId))
    .take(NEWS_TRANSLATION_LANGUAGES.length);
  return new Map(
    rows
      .filter((row) => row.sourceHash === sourceHash)
      .map((row) => [row.language, row]),
  );
}
