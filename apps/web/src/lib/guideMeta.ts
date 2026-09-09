/**
 * The guides' front matter: everything a route needs before it renders one.
 *
 * Split from `guides.ts` because the prose is large and the metadata is not.
 * TanStack keeps `loader` and `head` in the client entry while splitting
 * `component` into its own chunk, so a loader that imported the full guide
 * shipped every word of every guide to every visitor of every page. The
 * article route reads its title, description and FAQ schema from here, and
 * pulls the writing itself only inside the component.
 *
 * FAQs live on this side deliberately: `head` emits them as `FAQPage`
 * structured data, so they are metadata as much as content.
 */

/**
 * A question a reader actually types, with an answer short enough to be one.
 *
 * These are rendered as prose and emitted as `FAQPage` structured data, which
 * is what makes a guide eligible to answer the question directly in the
 * results rather than waiting to be clicked.
 */
type GuideFaq = {
  question: string;
  answer: string;
};

/** A guide's front matter, without the writing. See `Guide` in `guides.ts`. */
export type GuideMeta = {
  slug: string;
  /**
   * ISO date the guide first went live, as `datePublished`.
   *
   * Google treats this as required for Article rich results, and it is the
   * freshness signal an evergreen explainer competes on — so it is real data
   * here rather than a build timestamp, which would claim every guide was
   * rewritten on every deploy.
   */
  publishedAt: string;
  /**
   * ISO date of the last substantive revision, as `dateModified`. Omit while
   * the guide still says what it said on day one; bump it when the words
   * change, not when the file does.
   */
  updatedAt?: string;
  /** H1 and index-card title. */
  title: string;
  /** <title> tag. Longer, keyword-bearing. */
  metaTitle: string;
  metaDescription: string;
  /** One-sentence standfirst under the H1 and on the index card. */
  summary: string;
  faqs?: readonly GuideFaq[];
};

const GUIDE_META: readonly GuideMeta[] = [
  {
    slug: 'f1-2027-haas-second-seat',
    publishedAt: '2026-09-09',
    title: 'The 2027 Haas seat: five drivers in contention',
    metaTitle:
      '2027 Haas Seat: The Five Candidates to Partner Bearman | Grand Prix Picks',
    metaDescription:
      'Ocon, Doohan, Hirakawa, Rafael Câmara and Leonardo Fornaroli are in contention for Haas’s second 2027 seat. Their records, Haas experience and decision status.',
    summary:
      'Oliver Bearman is staying. Esteban Ocon, Jack Doohan, Ryo Hirakawa, Rafael Câmara and Leonardo Fornaroli are in contention for the other Haas seat.',
  },
  {
    slug: 'f1-points-system-explained',
    publishedAt: '2026-08-03',
    updatedAt: '2026-08-24',
    title: 'The F1 points system explained',
    metaTitle: 'F1 Points System Explained | Grand Prix Picks',
    metaDescription:
      'How Formula 1 championship points work: the scoring positions for a Grand Prix, sprint points, the constructors championship, and how tie-breaks are settled.',
    summary:
      'How Formula 1 itself awards championship points, and how that differs from the way a prediction game scores you.',
    faqs: [
      {
        question: 'How many points is an F1 win worth?',
        answer:
          'Winning a Grand Prix is worth 25 points. Winning a sprint is worth 8.',
      },
      {
        question: 'How many drivers score points in a Formula 1 race?',
        answer:
          'The top ten finishers score in a Grand Prix, from 25 points for the win down to a single point for tenth. A sprint pays the top eight, from 8 points down to 1.',
      },
      {
        question: 'Do sprint points count towards the championship?',
        answer:
          'Yes. Sprint points are added to the same drivers and constructors totals as Grand Prix points. There is no separate sprint championship.',
      },
      {
        question:
          'What happens if two drivers finish the season on the same points?',
        answer:
          'The tie is broken by countback. Whoever has more wins is placed ahead, and if they are still level it goes to the count of second places, then third places, until the tie resolves.',
      },
      {
        question:
          'Are Grand Prix Picks points the same as F1 championship points?',
        answer:
          'No. Formula 1 rewards where a driver finishes. Grand Prix Picks rewards how accurately you predicted the finishing order, so the two totals are unrelated.',
      },
    ],
  },
  {
    slug: 'f1-race-weekend-format',
    publishedAt: '2026-08-03',
    // Sprint weekends added and the prose rewritten on this date. Only ever
    // set for a substantive revision: the header and `dateModified` both read
    // it, so touching it for a typo is a freshness claim we did not earn.
    updatedAt: '2026-09-09',
    title: 'What happens across an F1 race weekend',
    metaTitle: 'F1 Race Weekend Format Explained | Grand Prix Picks',
    metaDescription:
      'A session-by-session explanation of a Formula 1 race weekend: what practice is for, how the three-part qualifying session works, and what happens on race day.',
    summary:
      'What happens in each session of a Grand Prix weekend, from Friday practice to the classification after the flag.',
    faqs: [
      {
        question: 'How many sessions are there in an F1 race weekend?',
        answer:
          'Five either way. A conventional weekend runs three practice sessions, qualifying and the Grand Prix. A sprint weekend drops two of the practice sessions and adds sprint qualifying and the sprint.',
      },
      {
        question: 'What order do the sessions run in?',
        answer:
          'A conventional weekend runs practice, then qualifying, then the Grand Prix. A sprint weekend runs one practice session, then sprint qualifying, then the sprint, then qualifying, then the Grand Prix.',
      },
      {
        question: 'Does qualifying decide the starting grid?',
        answer:
          'It sets the qualifying classification. Grid penalties are applied afterwards, so a driver can be classified third in qualifying and start the race tenth.',
      },
      {
        question: 'Why does practice matter if it does not affect the grid?',
        answer:
          'Practice is where the long runs happen, and the pattern of lap times within a single stint is the clearest signal of race pace. The headline timing screen is unreliable because teams run different fuel loads at different times.',
      },
      {
        question: 'Can the race result change after the chequered flag?',
        answer:
          'Yes. Stewards review incidents afterwards and can apply time penalties that change the classification, including the podium. Grand Prix Picks scores the official classification, so a late penalty can change your score with it.',
      },
    ],
  },
];

/** All guides' front matter, in the order they appear on the index page. */
export function listGuideMeta(): readonly GuideMeta[] {
  return GUIDE_META;
}

/** One guide's front matter by slug, or null when the slug is unknown. */
export function getGuideMeta(slug: string): GuideMeta | null {
  return GUIDE_META.find((guide) => guide.slug === slug) ?? null;
}
