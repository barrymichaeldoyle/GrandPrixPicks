/**
 * The languages the news API serves a story in (`docs/news-api.md`). Stories
 * are written in English; the rest are translations made after publishing
 * (`apps/backend/convex/newsApiTranslations.ts`).
 *
 * Defined once here so the Convex validator, the translator's request, the
 * web server's `lang` check and the OpenAPI document all read the same list.
 */
export const NEWS_TRANSLATION_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese (Brazilian)' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ar', name: 'Arabic' },
] as const;

export type NewsTranslationLanguage =
  (typeof NEWS_TRANSLATION_LANGUAGES)[number]['code'];

export type NewsLanguage = 'en' | NewsTranslationLanguage;

/** English first, then the translations in the order above. */
export const NEWS_LANGUAGES: readonly NewsLanguage[] = [
  'en',
  ...NEWS_TRANSLATION_LANGUAGES.map((language) => language.code),
];

/**
 * Chinese tags that ask for Traditional script. The translation is
 * Simplified, so these are not served by `zh`.
 */
const TRADITIONAL_CHINESE = /^zh-(hant|tw|hk|mo)(-|$)/;

/**
 * The language a `lang` tag is served in, or null when it is not one we
 * serve. A regional tag is served by its base language: `es-MX` reads `es`,
 * `pt-BR` reads `pt`, `en-GB` reads `en`.
 */
export function newsLanguageFor(tag: string): NewsLanguage | null {
  const lower = tag.toLowerCase();
  if (TRADITIONAL_CHINESE.test(lower)) {
    return null;
  }
  const base = lower.split('-')[0];
  return NEWS_LANGUAGES.find((code) => code === base) ?? null;
}
