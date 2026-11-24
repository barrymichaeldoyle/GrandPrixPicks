/**
 * Catch a story published again under a new key.
 *
 * The news routine sweeps twice a day and each sweep only sees its own
 * findings, so the same story kept coming back with a fresh key: the Alonso
 * Dakar story went out three times in 24 hours (17 to 18 Nov 2026), all
 * citing one Sky Sports article. Mekies's Red Bull extension and Audi's
 * Tsunoda appeal were each filed once under a race and again as global news.
 *
 * `gpp news publish` checks every new key against the live stories before the
 * first write:
 *
 * - **Refused:** the same source article (normalised URL) and a headline that
 *   shares at least three words with a live story. One URL alone is not
 *   enough: a stewards' document or a grid page backs several distinct
 *   stories in a weekend, so the two must also name the same people or teams
 *   ("Lawson starts from the pit lane" and "Alonso starts from the pit lane"
 *   share a stewards' document and are two stories).
 * - **Warned:** a different source, but a headline that overlaps heavily with
 *   a live story from the last week about the same people or teams (Bottas
 *   staying at Cadillac, reported by RaceFans then Motorsport.com). Follow-ups
 *   score like this too ("Verstappen takes his first pole", then "... first
 *   win"), so this one is a judgement for the operator, not a refusal.
 *
 * An item that is a genuinely new story despite a refusal says so with
 * `"notDuplicateOf": ["<key>", ...]`, naming the stories it was checked
 * against. Updating an existing key is never checked: that is the correction
 * path, and the one to use.
 */

const STOPWORDS = new Set(
  'the a an and or of to in on at for with from by is are was be as after before over into his her their its it this that f1 formula grand prix gp new says say said will could would has have had not but more than why how what who when'.split(
    ' ',
  ),
);

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Shared headline words before a same-source story counts as the same one. */
const SAME_SOURCE_SHARED = 3;
/** Overlap before a different-source story is flagged as a likely repeat. */
const SIMILAR_SHARED = 3;
const SIMILAR_JACCARD = 0.4;

function words(text) {
  return (text ?? '')
    .replace(/[’']s\b/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function headlineTokens(headline) {
  return new Set(
    words(headline)
      .map((word) => word.toLowerCase())
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

/**
 * The people, teams and places a headline names. Headlines are sentence
 * case, so a capitalised word is a name (or the first word, which only
 * widens the set and so makes a match less likely, never more).
 */
function subjects(headline) {
  return new Set(
    words(headline)
      .filter(
        (word) => /^\p{Lu}/u.test(word) && !STOPWORDS.has(word.toLowerCase()),
      )
      .map((word) => word.toLowerCase()),
  );
}

/** Words of a race scope's slug (`las-vegas-2026` -> las, vegas). */
function placeWords(scope) {
  return scope === 'global'
    ? []
    : scope.split('-').filter((part) => !/^\d+$/.test(part));
}

/**
 * Names in a headline other than the race's own place: "Las Vegas" in a Las
 * Vegas story says nothing about which story it is.
 */
function subjectsIn(headline, scope) {
  const names = subjects(headline);
  for (const word of placeWords(scope)) {
    names.delete(word);
  }
  return names;
}

function sameSubject(a, b) {
  return a.size > 0 && b.size > 0 && (isSubset(a, b) || isSubset(b, a));
}

function isSubset(a, b) {
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

function normalizeSourceUrl(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return (url ?? '').trim().toLowerCase();
  }
}

function overlap(a, b) {
  let shared = 0;
  for (const word of a) {
    if (b.has(word)) {
      shared++;
    }
  }
  return { shared, jaccard: shared / (a.size + b.size - shared || 1) };
}

/** `global/<key>` or `<raceSlug>/<key>`. */
function label(story) {
  return `${story.scope}/${story.key}`;
}

/**
 * Compare a batch of stories about to be published with the live ones.
 *
 * `incoming`: `{ scope, key, headline, sourceUrl, notDuplicateOf? }`, with
 * `scope` the race slug or `'global'`, in publish order.
 * `existing`: live and retracted stories, `{ scope, key, headline, sourceUrl,
 * publishedAt, active }`.
 *
 * Returns `{ refusals, warnings }`, one line each, naming both stories.
 */
export function findDuplicates(incoming, existing, now = Date.now()) {
  const known = new Set(existing.map(label));
  const pool = existing
    .filter((story) => story.active !== false)
    .map((story) => ({ ...story }));
  const refusals = [];
  const warnings = [];

  for (const item of incoming) {
    const itemLabel = label(item);
    if (known.has(itemLabel)) {
      // An update to an existing key: the correction path.
      continue;
    }
    const cleared = new Set(item.notDuplicateOf ?? []);
    const tokens = headlineTokens(item.headline);
    const url = item.sourceUrl ? normalizeSourceUrl(item.sourceUrl) : null;

    for (const story of pool) {
      if (cleared.has(story.key) || cleared.has(label(story))) {
        continue;
      }
      const { shared, jaccard } = overlap(
        tokens,
        headlineTokens(story.headline),
      );
      // Place words are dropped for the story's own race, whichever side
      // that is.
      const scope = item.scope === 'global' ? story.scope : item.scope;
      const aboutTheSame = sameSubject(
        subjectsIn(item.headline, scope),
        subjectsIn(story.headline, scope),
      );
      const sameSource =
        url !== null &&
        story.sourceUrl &&
        normalizeSourceUrl(story.sourceUrl) === url;
      if (sameSource && aboutTheSame && shared >= SAME_SOURCE_SHARED) {
        refusals.push(
          `${itemLabel}: same source article and headline as live ${label(story)} ("${story.headline}"). ` +
            `Reuse key "${story.key}" to update it, or add "notDuplicateOf": ["${story.key}"] if this is a different story.`,
        );
        continue;
      }
      // Two races' news never describe the same event; global news can
      // repeat either.
      const comparable =
        story.scope === item.scope ||
        story.scope === 'global' ||
        item.scope === 'global';
      const recent =
        story.publishedAt === undefined || now - story.publishedAt <= WEEK;
      if (!comparable || !recent) {
        continue;
      }
      if (
        aboutTheSame &&
        shared >= SIMILAR_SHARED &&
        jaccard >= SIMILAR_JACCARD
      ) {
        warnings.push(
          `${itemLabel}: POSSIBLE DUPLICATE of ${label(story)} ("${story.headline}"). ` +
            `If it is the same news, update "${story.key}" or skip it; publish a new key only for a new development.`,
        );
      }
    }
    // Later items in the batch are checked against this one too.
    pool.push({ ...item, publishedAt: now, active: true });
  }
  return { refusals, warnings };
}
