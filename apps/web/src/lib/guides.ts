/**
 * The guides themselves: the writing served at /guides/<slug>.
 *
 * Front matter lives in `guideMeta.ts` and this module merges the two, so a
 * caller still sees one `Guide`. Import this module only from a route's
 * component (or from something a component renders) — importing it from a
 * `loader` or `head` puts every word in the client entry, which is the thing
 * the split exists to prevent. `guideMeta.ts` explains why.
 *
 * Keep entries evergreen: anything that depends on a single season's standings
 * belongs on a data page (/f1-standings, /leaderboard), not in a guide that
 * nobody will remember to update.
 */
import type { GuideMeta } from './guideMeta';
import { getGuideMeta } from './guideMeta';

/**
 * Evergreen written guides served at /guides/<slug>.
 *
 * Content lives here rather than in per-route JSX so the sitemap, the index
 * page and the article route all read from one list. Keep entries evergreen:
 * anything that depends on a single season's standings belongs on a data page
 * (/f1-standings, /leaderboard), not in a guide that nobody will remember to
 * update.
 */

/**
 * A table rendered after the paragraphs, for content that is actually tabular.
 *
 * The definition list below was this module's only structural primitive for a
 * while, which meant genuinely columnar content arrived as prose: a points
 * scale read "the top nine score: 13, 10, 8, 6, 5, 4, 3, 2, 1", which is a row
 * flattened into a clause and cannot be scanned. Tables are also the shape
 * Google will lift into a result; a `<dl>` is not.
 *
 * Use it only when the cells are short and the columns mean the same thing all
 * the way down. Anything that wants a sentence per row is still a `list`.
 */
type GuideTable = {
  columns: readonly string[];
  /** Cells in column order. The first is rendered as the row's header. */
  rows: readonly (readonly string[])[];
};

type GuideSection = {
  heading: string;
  paragraphs: readonly string[];
  /** Optional definition list rendered after the paragraphs. */
  list?: readonly { term: string; detail: string }[];
  /** Optional table rendered after the paragraphs. See {@link GuideTable}. */
  table?: GuideTable;
};

/**
 * A page on this site that shows the guide's subject as live data.
 *
 * Guides used to link only to other guides, which left the pages carrying the
 * most search impressions pointing at nothing that could convert a reader into
 * a player. The union is closed so a link cannot rot into a 404.
 */
type GuideLiveLink = {
  to:
    | '/'
    | '/f1-standings'
    | '/f1-team-mate-battles'
    | '/races'
    | '/leaderboard';
  label: string;
  detail: string;
};

/** A guide's writing, keyed by the slug its front matter carries. */
type GuideBody = {
  sections: readonly GuideSection[];
  liveLinks?: readonly GuideLiveLink[];
};

/** Front matter and writing, as the article route renders it. */
export type Guide = GuideMeta & GuideBody;

const GUIDE_BODIES: Record<string, GuideBody> = {
  'f1-points-system-explained': {
    sections: [
      {
        heading: 'Grand Prix points',
        paragraphs: [
          'The top ten finishers score in a Formula 1 Grand Prix. The scale rewards winning far more than a solid points finish: first place alone is worth seven more points than second, which is a bigger step than any other on the scale.',
        ],
        table: {
          columns: ['Position', 'Points'],
          rows: [
            ['1st', '25'],
            ['2nd', '18'],
            ['3rd', '15'],
            ['4th', '12'],
            ['5th', '10'],
            ['6th', '8'],
            ['7th', '6'],
            ['8th', '4'],
            ['9th', '2'],
            ['10th', '1'],
          ],
        },
      },
      {
        heading: 'Sprint points',
        paragraphs: [
          'Sprints award a smaller set of points to the leading finishers, on a much shallower scale than a Grand Prix. The intent is to make the sprint worth contesting without letting it distort the championship, so winning a sprint is worth meaningfully less than winning a Grand Prix.',
          'Only the top eight score, rather than the top ten, and the gap between winning and finishing second is a single point rather than seven.',
          'Sprint points count towards both championships in exactly the same way as Grand Prix points. They are simply added to the total.',
        ],
        table: {
          columns: ['Position', 'Points'],
          rows: [
            ['1st', '8'],
            ['2nd', '7'],
            ['3rd', '6'],
            ['4th', '5'],
            ['5th', '4'],
            ['6th', '3'],
            ['7th', '2'],
            ['8th', '1'],
          ],
        },
      },
      {
        heading: 'Two championships, one set of results',
        paragraphs: [
          'Every point a driver scores counts twice: once towards the drivers championship, and once towards their team constructors total. A team constructors score is the sum of what both of its drivers score, which is why a team with two consistently strong drivers can out-score a team with one exceptional driver and one struggling one.',
          'This is also why teams sometimes make decisions that look strange from a single driver perspective. Protecting a constructors position is worth real money in prize distribution, and it can outweigh an individual driver interest late in a season.',
        ],
      },
      {
        heading: 'Ties and classification',
        paragraphs: [
          'When two drivers finish a season on the same number of points, the tie is broken by countback: whoever has more wins takes the higher position. If they are still level, it goes to the count of second places, then third, and so on until the tie resolves.',
          'A driver must also be classified to score. In practice that means completing enough of the race distance, so a car that retires very late can still be classified and can still score, while an early retirement cannot.',
        ],
      },
      {
        heading: 'How this differs from predicting',
        paragraphs: [
          'It is worth being clear that Formula 1 championship points and Grand Prix Picks points are entirely separate systems. F1 rewards where a driver finishes. A prediction game rewards how accurately you called it.',
          'That distinction matters when you are choosing picks. Backing the championship leader in every slot is not a strategy, because you are not scored on how good your drivers are. You are scored on how close your predicted order is to the real one, which means the interesting decisions are almost always in positions three to five rather than at the front.',
        ],
      },
    ],
    liveLinks: [
      {
        to: '/f1-standings',
        label: 'F1 championship standings',
        detail:
          'The current drivers and constructors tables, built from these points.',
      },
      {
        to: '/leaderboard',
        label: 'Prediction leaderboard',
        detail: 'How players are scoring, which is a different table entirely.',
      },
    ],
  },
  'f1-race-weekend-format': {
    sections: [
      {
        heading: 'Practice',
        paragraphs: [
          'A conventional Grand Prix weekend opens with three practice sessions, two on Friday and one on Saturday morning. Nothing that happens in them affects the grid, which leads a lot of people to skip them. That is a mistake if you care about predicting the result.',
          'Teams use practice to work through a planned programme: aerodynamic measurement runs, setup changes evaluated back to back, and crucially a long run on race-distance fuel to understand how the tyres behave over a stint. The final practice session is typically the closest thing to a genuine qualifying simulation.',
          'Because teams run different fuel loads and engine settings at different times, the headline timing screen during practice is unreliable. What is informative is the pattern of lap times within a single long stint, which shows how quickly a car is degrading its tyres.',
        ],
      },
      {
        heading: 'Qualifying',
        paragraphs: [
          'Qualifying is a single session split into three parts, each shorter than the last, with the slowest cars eliminated at the end of each part. The drivers who survive to the final part fight for pole position, and the order they set becomes the starting grid.',
          'The elimination structure is what makes it compelling. A driver on the edge of the cut has to commit to a fast lap in traffic with the clock running out, and a small mistake ends their session immediately. Track conditions usually improve as more rubber goes down, which adds a timing element: going out too early can cost a place, and going out too late risks not completing a lap at all.',
        ],
        list: [
          {
            term: 'Q1',
            detail:
              'The full field runs. The slowest cars are eliminated and fill the back of the grid in the order they set.',
          },
          {
            term: 'Q2',
            detail:
              'The remaining cars run again, and the slowest of those are eliminated to fill the middle of the grid.',
          },
          {
            term: 'Q3',
            detail:
              'The fastest cars contest pole position and the front of the grid.',
          },
        ],
      },
      {
        heading: 'Grid penalties',
        paragraphs: [
          'The starting grid is not always the qualifying order. Drivers can receive grid penalties for exceeding their season allocation of power unit components, for gearbox changes, or as a sanction for an incident at a previous race. Those penalties are applied after qualifying.',
          'This distinction matters when predicting. A grid penalty does not change the qualifying classification itself, so a driver can be classified third in qualifying and still start tenth. If you are predicting a qualifying session, the penalty is irrelevant. If you are predicting the race, it is central.',
        ],
      },
      {
        heading: 'Race day',
        paragraphs: [
          'The race begins with a formation lap, after which cars form up on the grid and the start is signalled by five red lights going out. The first corner is statistically the most likely place for contact across the entire race, and positions gained or lost there frequently decide the result.',
          'From there the race is a balance between outright pace and tyre management. Regulations require drivers to use more than one tyre compound in a dry race, so at least one pit stop is mandatory, and the decision of when to take it is where most strategic battles are won.',
          'Safety cars are the main source of disruption. When one is deployed, the field bunches up and a pit stop costs far less time than usual, which can hand a large advantage to whoever has not yet stopped. A well-timed safety car can rewrite a race that looked settled.',
        ],
      },
      {
        heading: 'After the flag',
        paragraphs: [
          'The result is not final when the chequered flag falls. Stewards review incidents from the race and can apply time penalties afterwards, which sometimes changes the classification, including the podium.',
          'Grand Prix Picks scores the official classification rather than the order the cars crossed the line, so a post-race penalty can change your score after the fact. That is deliberate: the official result is the one that counts for the championship, so it is the one worth predicting.',
        ],
      },
    ],
    liveLinks: [
      {
        to: '/races',
        label: 'Race calendar',
        detail: 'Every round of the season, with session times for each one.',
      },
      {
        to: '/f1-team-mate-battles',
        label: 'Team-mate head to heads',
        detail:
          'Who is beating whom across qualifying and races, session by session.',
      },
    ],
  },
};

/** A single guide by slug, or null when the slug is unknown. */
export function getGuide(slug: string): Guide | null {
  const meta = getGuideMeta(slug);
  const body = GUIDE_BODIES[slug];
  return meta && body ? { ...meta, ...body } : null;
}
