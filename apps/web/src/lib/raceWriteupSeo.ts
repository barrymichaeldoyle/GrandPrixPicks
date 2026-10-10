import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

import { reviewedIsoDate } from '@/lib/lastReviewed';
import {
  getRaceWriteupPhase,
  type RaceWriteupPhaseRace,
} from '@/lib/raceWriteupPhase';
import { getRaceWriteup, listRaceWriteups } from '@/lib/raceWriteups';
import {
  breadcrumbSchema,
  pageMeta,
  raceNewsOgImageUrl,
  raceWriteupOgImageUrl,
  siteConfig,
  sportsEventSchema,
} from '@/lib/site';

/**
 * Head metadata that hands a race page's search equity to its write-up.
 *
 * `/races/$slug` and `/f1-2026-*-grand-prix-predictions` answer the same query
 * for a weekend that has editorial copy, so only one of them should compete:
 * the write-up. The race page stays reachable and unchanged for players (it is
 * where the picks, results and duels live, and most of the app links to it),
 * it just stops asking to be indexed and points its canonical at the write-up.
 *
 * A redirect would consolidate the same signal, but it would also take the
 * game away: every race card, notification, feed row and score card links here.
 *
 * Returns null for the normal case, a weekend nobody wrote up.
 */
export function racePageWriteupHeadOptions(raceSlug: string): {
  canonicalPath: string;
  noIndex: true;
} | null {
  const writeup = getRaceWriteup(raceSlug);
  if (!writeup) {
    return null;
  }
  return { canonicalPath: writeup.to, noIndex: true };
}

/**
 * Where a deleted circuit page should 301.
 *
 * The circuit pages all used to go to `/races` because inverting race→circuit
 * needs a season, and a hand-kept table would rot. Write-ups now exist for
 * some venues, and those are the indexed page for that circuit. Pointing
 * `/circuits/madring` at the calendar asked Google to transfer Madrid queries
 * onto a list of every round.
 *
 * Derived from the write-up registry and the existing race→circuit map, so
 * adding a write-up is what retargets the redirect. Circuits nobody wrote up
 * still go to `/races`.
 */
export function circuitPageRedirectTarget(circuitSlug: string): string {
  for (const writeup of listRaceWriteups()) {
    const circuit = getCircuitForRace(writeup.raceSlug);
    if (circuit?.slug === circuitSlug) {
      return writeup.to;
    }
  }
  return '/races';
}

/**
 * Which search snippet a write-up should carry on race weekend.
 *
 * Monza drew 483 impressions on its qualifying and race days at position 6.5
 * and not one click, while its title still read "Predictions & Picks". By then
 * the search is "when does it start" and "who is on pole", and a preview title
 * is not an answer. So once qualifying has locked and the starting grid is on
 * the page (it rides on a `raceNews` item), the snippet leads with the grid.
 *
 * Gated on the grid rather than on the clock alone, because metadata must not
 * promise what the page does not show (`docs/race-writeup-lifecycle.md`). It
 * also ends at lights out: the news section, and the grid with it, is a live
 * module that the page drops once race picks lock.
 */
export function raceWeekendSnippet({
  race,
  now,
  gridPublished,
}: {
  race: RaceWriteupPhaseRace;
  now: number;
  gridPublished: boolean;
}): boolean {
  return gridPublished && getRaceWriteupPhase(race, now) === 'race-picks';
}

type WriteupHeadRace = {
  raceStartAt: number;
  status: string;
};

type WriteupHeadStory = {
  key: string;
  headline: string;
  publishedAt: number;
  headlineUpdatedAt?: number;
};

/**
 * The story a shared write-up link names with `?story=<key>`, if it is still
 * on the page.
 *
 * News posts on X all link to the write-up, and X caches a link preview by
 * URL. The query string gives each post its own URL, and so its own card
 * showing that story's headline, while the canonical stays the bare write-up:
 * this is a different preview of one page, not a second page. A key that is
 * unknown, retracted or off the write-up falls back to the write-up's card.
 */
function sharedStory(
  search: unknown,
  news: readonly WriteupHeadStory[] | undefined,
): WriteupHeadStory | undefined {
  if (!search || typeof search !== 'object' || !('story' in search)) {
    return undefined;
  }
  const key = search.story;
  return typeof key === 'string'
    ? news?.find((item) => item.key === key)
    : undefined;
}

type WriteupHeadFaq = {
  question: string;
  answer: string;
};

/**
 * The `<head>` every race write-up emits: title, description, OG, JSON-LD.
 *
 * Five pages had grown five copies of this graph, and the copies had already
 * drifted once: a three-property SportsEvent stub that Search Console
 * discarded. One builder, so the next write-up cannot ship a second shape.
 */
export function raceWriteupPageHead({
  path,
  raceSlug,
  title,
  description,
  imageAlt,
  reviewedAt,
  eventName,
  eventAlternateName,
  breadcrumbName,
  race,
  news,
  search,
  faqs,
  extraGraph = [],
}: {
  path: string;
  raceSlug: string;
  title: string;
  description: {
    live: string;
    finished: string;
    cancelled: string;
  };
  imageAlt: string;
  reviewedAt: number;
  /** The official Grand Prix name, used as the SportsEvent `name`. */
  eventName: string;
  /** A common shorthand the page also ranks for, e.g. "2026 Madrid Grand Prix". */
  eventAlternateName?: string;
  breadcrumbName: string;
  race?: WriteupHeadRace | null;
  /** The write-up's news items, to resolve a `?story=` link's card. */
  news?: readonly WriteupHeadStory[];
  /** The route match's search params. */
  search?: unknown;
  faqs: readonly WriteupHeadFaq[];
  extraGraph?: readonly object[];
}) {
  const resolvedDescription =
    race?.status === 'finished'
      ? description.finished
      : race?.status === 'cancelled'
        ? description.cancelled
        : description.live;
  const circuit = getCircuitForRace(raceSlug);
  const image = raceWriteupOgImageUrl(raceSlug);
  const story = sharedStory(search, news);
  const meta = pageMeta({
    title,
    description: resolvedDescription,
    path,
    image: story
      ? raceNewsOgImageUrl(
          raceSlug,
          story.key,
          story.headlineUpdatedAt ?? story.publishedAt,
        )
      : image,
    imageAlt: story ? story.headline : imageAlt,
  });
  const event =
    race && circuit
      ? {
          ...sportsEventSchema({
            name: eventName,
            startAt: race.raceStartAt,
            path,
            description: resolvedDescription,
            image,
            location: circuit,
            cancelled: race.status === 'cancelled',
          }),
          ...(eventAlternateName ? { alternateName: eventAlternateName } : {}),
        }
      : null;

  return {
    ...meta,
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': `${siteConfig.url}${path}#page`,
              url: `${siteConfig.url}${path}`,
              name: title,
              description: resolvedDescription,
              dateModified: reviewedIsoDate(reviewedAt),
              inLanguage: 'en',
              isPartOf: { '@id': `${siteConfig.url}/#app` },
              ...(event ? { about: event } : {}),
            },
            {
              '@type': 'FAQPage',
              '@id': `${siteConfig.url}${path}#faq`,
              mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: { '@type': 'Answer', text: faq.answer },
              })),
            },
            breadcrumbSchema(path, [
              { name: 'Races', path: '/races' },
              { name: breadcrumbName, path },
            ]),
            ...extraGraph,
          ],
        }),
      },
    ],
  };
}
