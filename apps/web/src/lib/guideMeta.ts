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
    slug: 'f1-sprint-weekends-explained',
    publishedAt: '2026-08-03',
    title: 'How F1 sprint weekends work',
    metaTitle: 'How F1 Sprint Weekends Work | Grand Prix Picks',
    metaDescription:
      'A plain explanation of the Formula 1 sprint weekend format: the running order, how sprint qualifying differs, and what changes for a normal Grand Prix weekend.',
    summary:
      'Six times a season the schedule changes shape. Here is what actually differs, and why it matters if you are predicting results.',
    faqs: [
      {
        question: 'How many practice sessions are there on a sprint weekend?',
        answer:
          'One. A conventional Grand Prix weekend has three, so teams go into a competitive session with about a third of the usual running.',
      },
      {
        question: 'What order do the sessions run in on a sprint weekend?',
        answer:
          'Free Practice 1, then sprint qualifying, then the sprint, then qualifying, then the Grand Prix. Sprint qualifying comes before the sprint, and the main qualifying session sits between the sprint and Sunday.',
      },
      {
        question: 'Does sprint qualifying set the grid for the Grand Prix?',
        answer:
          'No. Sprint qualifying sets the grid for the sprint only. The Grand Prix grid comes from the separate qualifying session held after the sprint.',
      },
      {
        question: 'How many points does the sprint pay?',
        answer:
          'The top eight score, from 8 points for the win down to 1 point for eighth. Those points are added to the same championship totals as Grand Prix points.',
      },
      {
        question: 'Is a sprint weekend worth more on Grand Prix Picks?',
        answer:
          'Yes. Every session is scored separately, so a sprint weekend has four scoreable sessions instead of two: sprint qualifying, the sprint, qualifying and the race.',
      },
    ],
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
    slug: 'f1-half-points-races',
    publishedAt: '2026-09-05',
    title: 'Every F1 race that did not pay full points',
    metaTitle: 'F1 Half Points: Every Race That Paid Less | Grand Prix Picks',
    metaDescription:
      'Half points have been awarded six times in Formula 1 history. The full list, why each race was stopped, and the sliding scale that replaced the half-points rule.',
    summary:
      'Six times in seventy-odd years, a Grand Prix has paid less than it should have. Here is every one, and the rule that decides it now.',
    faqs: [
      {
        question: 'How many times have half points been awarded in F1?',
        answer:
          'Six: the 1975 Spanish and Austrian Grands Prix, the 1984 Monaco Grand Prix, the 1991 Australian Grand Prix, the 2009 Malaysian Grand Prix and the 2021 Belgian Grand Prix. 1975 is the only season to have two.',
      },
      {
        question: 'Does Formula 1 still award half points?',
        answer:
          'No. Half points were replaced for 2022 by a sliding scale that pays a different amount depending on how much of the race was completed. A race that runs past three-quarters distance still pays full points.',
      },
      {
        question: 'Why did the 2021 Belgian Grand Prix award half points?',
        answer:
          'The race never ran under green flags. The field completed a couple of laps behind the safety car in heavy rain, which was enough to classify a result and award half points under the rules of the time. The reaction to it is what produced the current sliding scale.',
      },
      {
        question: 'What is the shortest race in Formula 1 history?',
        answer:
          'The 1991 Australian Grand Prix at Adelaide. It was stopped after 16 of a scheduled 81 laps in torrential rain, and the classification was taken from lap 14. Ayrton Senna won it.',
      },
      {
        question: 'Who is the only woman to score points in Formula 1?',
        answer:
          'Lella Lombardi, at the 1975 Spanish Grand Prix. She finished sixth in a race that paid half points, so her score stands as half a point: the only half-point total in the championship record.',
      },
      {
        question: 'How many laps does an F1 race need for full points?',
        answer:
          'Three-quarters of the scheduled distance. Below that, the sliding scale introduced for 2022 pays a reduced set of points, and a race that does not complete two laps pays nothing at all.',
      },
    ],
  },
  {
    slug: 'how-to-predict-f1-top-five',
    publishedAt: '2026-08-03',
    title: 'How to predict an F1 top five',
    metaTitle: 'How to Predict an F1 Top 5 | Grand Prix Picks',
    metaDescription:
      'Practical strategy for predicting Formula 1 finishing positions: what qualifying actually tells you, which signals are worth trusting, and where most predictions go wrong.',
    summary:
      'The signals worth trusting, the ones that mislead, and why the back half of your top five is where positions are won and lost.',
    faqs: [
      {
        question: 'How does Grand Prix Picks score a top five prediction?',
        answer:
          'Five points for putting a driver in exactly the right position, three for being one place out, and one for naming a driver who finished in the top five but placing them two or more positions away. Twenty-five points is the maximum for a session.',
      },
      {
        question: 'Does the order of my picks matter?',
        answer:
          'Yes. Scoring compares each pick against the position you gave it, so naming the right five drivers in the wrong order scores far less than getting the order right. Being one place out still pays three points, which is why near misses are worth chasing.',
      },
      {
        question: 'Which positions should I spend the most time on?',
        answer:
          'Positions three to five. The front of the grid is usually settled, while three to five is where several teams are genuinely close and where the order actually moves.',
      },
      {
        question: 'Is practice pace useful for predicting a race?',
        answer:
          'Long-run stint pace is one of the best signals available and most people ignore it. Single practice lap times are close to meaningless, because fuel loads and engine modes are not published.',
      },
      {
        question: 'Do last season results at the same circuit help?',
        answer:
          'Less than they feel like they should. The character of a circuit persists, but the competitive order does not: cars change enormously between seasons, and recent form over the last two or three weekends is a better guide.',
      },
    ],
  },
  {
    slug: 'f1-race-weekend-format',
    publishedAt: '2026-08-03',
    title: 'What happens across an F1 race weekend',
    metaTitle: 'F1 Race Weekend Format Explained | Grand Prix Picks',
    metaDescription:
      'A session-by-session explanation of a Formula 1 race weekend: what practice is for, how the three-part qualifying session works, and what happens on race day.',
    summary:
      'A session-by-session walkthrough for anyone who wants to know what teams are actually doing on Friday.',
    faqs: [
      {
        question: 'How many sessions are there in an F1 race weekend?',
        answer:
          'Five on a conventional weekend: three practice sessions, qualifying, and the Grand Prix. A sprint weekend runs five as well, but cuts practice to one session and adds sprint qualifying and the sprint.',
      },
      {
        question: 'What order do the sessions run in?',
        answer:
          'A conventional weekend runs practice, then qualifying, then the Grand Prix. A sprint weekend runs one practice session, then sprint qualifying, then the sprint, then qualifying, then the Grand Prix.',
      },
      {
        question: 'Does qualifying decide the starting grid?',
        answer:
          'It sets the classification, but grid penalties are applied afterwards. A driver can be classified third in qualifying and still start tenth, which is why a qualifying prediction and a race prediction are different problems.',
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
