import { NEWS_TRANSLATION_LANGUAGES } from '@grandprixpicks/shared/newsLanguages';
import { NEWS_TOPICS } from '@grandprixpicks/shared/newsTopics';
import { v } from 'convex/values';

/**
 * A language a story is translated into: one of `NEWS_TRANSLATION_LANGUAGES`
 * (`packages/shared/src/newsLanguages.ts`).
 */
export const newsTranslationLanguageValidator = v.union(
  ...NEWS_TRANSLATION_LANGUAGES.map(({ code }) => v.literal(code)),
);

/** A language a story is served in: English or a translation. */
export const newsLanguageValidator = v.union(
  v.literal('en'),
  ...NEWS_TRANSLATION_LANGUAGES.map(({ code }) => v.literal(code)),
);

/**
 * `topic` on `raceNews` and `globalNews`: one of `NEWS_TOPICS`
 * (`packages/shared/src/newsTopics.ts`), the single list of them.
 */
export const newsTopicValidator = v.union(
  ...NEWS_TOPICS.map((topic) => v.literal(topic)),
);

/** A news API key's plan. Limits per plan: `NEWS_API_PLANS` in `newsApi.ts`. */
export const newsApiPlanValidator = v.union(
  v.literal('free'),
  v.literal('hobby'),
  v.literal('commercial'),
);
