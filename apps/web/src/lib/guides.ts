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
  /** Driver profiles use the existing flat panel style. */
  card?: boolean;
  /**
   * A credited photograph for a `card` section, cropped square beside the
   * heading.
   *
   * Credit and licence are required fields rather than optional ones: every
   * one of these is a freely licensed copyrighted photograph, and the licence
   * is only honoured while the attribution renders with the image. Files and
   * their verification live in `public/images/guides/ATTRIBUTION.md`.
   */
  image?: {
    src: string;
    width: number;
    height: number;
    alt: string;
    /**
     * Where the square crop should sit, as a CSS `object-position`.
     *
     * A centred crop of a standing portrait lands on the chest: every face
     * here sits in the top third of its source photograph, so the offset is
     * per-image data rather than one shared rule. Omitted for anything already
     * framed square, and for the car photograph, whose subject is central.
     */
    focus?: string;
    credit: string;
    sourceUrl: string;
    license: string;
    licenseUrl: string;
  };
  sources?: readonly { label: string; url: string }[];
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
  status?: string;
  hero?: {
    src: string;
    width: number;
    height: number;
    alt: string;
    caption: string;
    credit: string;
    sourceUrl: string;
    license: string;
    licenseUrl: string;
  };
  liveLinks?: readonly GuideLiveLink[];
};

/** Front matter and writing, as the article route renders it. */
export type Guide = GuideMeta & GuideBody;

const GUIDE_BODIES: Record<string, GuideBody> = {
  // Keep this URL when Haas announces. Replace status and opening section,
  // retain the shortlist as dated context, and bump guideMeta.updatedAt.
  'f1-2027-haas-second-seat': {
    status:
      'As of 9 September 2026, Haas has not announced who will take the second seat for 2027.',
    hero: {
      src: '/images/guides/haas-monza-2025.jpg',
      width: 1280,
      height: 853,
      alt: 'Oliver Bearman driving the Haas VF-25 during qualifying at Monza in 2025',
      caption:
        'Bearman at Monza in 2025. Haas is choosing his team-mate for 2027.',
      credit: 'Eustace Bagge',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Oliver_Bearman_2025_Italian_Grand_Prix_qualifying.jpg',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    sections: [
      {
        heading: 'What Komatsu has said',
        paragraphs: [
          'Writing for the Japanese publication as-web.jp during the Monza weekend, Ayao Komatsu named the five drivers in contention for one 2027 Haas seat.',
          'Ocon has the seat now and is one of the five. Haas has been comparing the others in private testing. Grandprix.com reports that Hirakawa, Fornaroli and Bearman were within a tenth of a second of each other at Jerez, and that Haas gathered more data at Portimao afterwards. Doohan’s own test is due at Jerez, and Haas has not said the seat has been offered to anyone.',
        ],
        sources: [
          {
            label:
              'Grandprix.com: Komatsu’s five-driver shortlist (4 September)',
            url: 'https://www.grandprix.com/news/komatsu-confirms-five-driver-fight-for-ocons-haas-seat.html',
          },
          {
            label: 'SPEEDWEEK: Komatsu’s comments at Monza (5 September)',
            url: 'https://www.speedweek.com/en/a/formula-1/haas-team-principal-ayao-komatsu-these-five-drivers-are-in-the-running-for-2027',
          },
        ],
      },
      {
        heading: 'Why Bearman is not on the list',
        paragraphs: [
          'The five are competing for one seat. Bearman holds the other, and Komatsu left him out of the contest because his place in the team is secure.',
          'Haas’s July 2024 release says Bearman signed a multi-year contract beginning with the 2025 season. It names no end year. PlanetF1 reports the deal runs to the end of 2026 with a team option for 2027, and that Haas is expected to take it. Haas has confirmed neither the expiry nor the option.',
        ],
        sources: [
          {
            label:
              'Haas: Bearman signed on a multi-year contract from 2025 (4 July 2024)',
            url: 'https://www.haasf1team.com/news/moneygram-haas-f1-team-signs-oliver-bearman',
          },
          {
            label:
              'Grandprix.com: Bearman is outside the five because his place is secure (4 September 2026)',
            url: 'https://www.grandprix.com/news/komatsu-confirms-five-driver-fight-for-ocons-haas-seat.html',
          },
          {
            label:
              'PlanetF1: the reported 2+1 contract and 2027 option (30 August 2026)',
            url: 'https://www.planetf1.com/news/f1-2026-driver-contract-statuses',
          },
        ],
      },
      {
        heading: 'Esteban Ocon',
        card: true,
        image: {
          src: '/images/guides/esteban-ocon.jpg',
          width: 383,
          height: 480,
          alt: 'Esteban Ocon at Suzuka in 2024',
          focus: 'center 6%',
          credit: 'Rrtb505050',
          sourceUrl:
            'https://commons.wikimedia.org/wiki/File:Esteban_Ocon_2024_Suzuka_(cropped).jpg',
          license: 'CC0',
          licenseUrl:
            'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
        },
        paragraphs: [
          'Ocon joined Haas in 2025 and finished fifth in China in his second race for the team. He won the 2021 Hungarian Grand Prix with Alpine. He is the one candidate Haas can measure across a full season in its current car, and keeping him would leave the line-up unchanged.',
        ],
        sources: [
          {
            label: 'Haas: Esteban Ocon’s career and results',
            url: 'https://www.haasf1team.com/season/team/esteban-ocon',
          },
        ],
      },
      {
        heading: 'Jack Doohan',
        card: true,
        image: {
          src: '/images/guides/jack-doohan.jpg',
          width: 288,
          height: 480,
          alt: 'Jack Doohan in the paddock in 2023',
          focus: 'center 20%',
          credit: 'Byxelized',
          sourceUrl:
            'https://commons.wikimedia.org/wiki/File:Jack_Doohan_2023.jpg',
          license: 'CC0',
          licenseUrl:
            'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
        },
        paragraphs: [
          'Doohan joined Haas as a reserve driver in February 2026. He finished third in Formula 2 in 2023, made his F1 debut with Alpine at Abu Dhabi in 2024, and raced the opening six Grands Prix of 2025. Besides Ocon, he is the only candidate who has started a Grand Prix.',
        ],
        sources: [
          {
            label: 'Haas: Jack Doohan’s reserve role and junior record',
            url: 'https://www.haasf1team.com/season/team/jack-doohan',
          },
        ],
      },
      {
        heading: 'Ryo Hirakawa',
        card: true,
        image: {
          src: '/images/guides/ryo-hirakawa.jpg',
          width: 320,
          height: 480,
          alt: 'Ryo Hirakawa in Toyota Gazoo Racing kit at Fuji in 2024',
          focus: 'center 18%',
          credit: 'Morio',
          sourceUrl:
            'https://commons.wikimedia.org/wiki/File:Ryo_Hirakawa_2024_WEC_Fuji_3.jpg',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        },
        paragraphs: [
          'Hirakawa became a Haas reserve in April 2025 after testing the VF-24 in Abu Dhabi. He ran four Haas FP1 sessions in 2025: Bahrain, Spain, Mexico City and Abu Dhabi. He also races Toyota’s endurance programme, and Toyota is a Haas partner.',
        ],
        sources: [
          {
            label: 'Haas: Ryo Hirakawa’s testing and practice record',
            url: 'https://www.haasf1team.com/season/team/ryo-hirakawa',
          },
        ],
      },
      {
        heading: 'Rafael Câmara',
        card: true,
        image: {
          src: '/images/guides/rafael-camara.jpg',
          width: 425,
          height: 480,
          alt: 'Rafael Câmara in 2022',
          focus: 'center 25%',
          credit: 'KVYTICAL',
          sourceUrl:
            'https://commons.wikimedia.org/wiki/File:Rafael_C%C3%A2mara_in_2022.jpg',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        },
        paragraphs: [
          'Câmara won the 2025 FIA Formula 3 title as a rookie with Trident, with four wins and five pole positions. He is a Ferrari Driver Academy member and moved to Formula 2 with Invicta for 2026. Haas has run him in its private testing.',
        ],
        sources: [
          {
            label: 'Formula 3: Câmara’s 2025 title-winning season',
            url: 'https://www.fiaformula3.com/en/information/rafael-camara-2025-champion.6Xzppi1iWCn1PUraUFD0ws',
          },
          {
            label: 'Grandprix.com: Haas’s candidate testing',
            url: 'https://www.grandprix.com/news/komatsu-confirms-five-driver-fight-for-ocons-haas-seat.html',
          },
        ],
      },
      {
        heading: 'Leonardo Fornaroli',
        card: true,
        image: {
          src: '/images/guides/leonardo-fornaroli.jpg',
          width: 480,
          height: 270,
          alt: 'Leonardo Fornaroli driving his Invicta Formula 2 car in Austria in 2025',
          credit: 'Lukas Raich',
          sourceUrl:
            'https://commons.wikimedia.org/wiki/File:FIA_F2_Austria_2025_Nr._1_Fornaroli.jpg',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        },
        paragraphs: [
          'Fornaroli won the 2024 FIA Formula 3 championship, then the 2025 Formula 2 title with Invicta in his rookie season. Haas has run him in its private testing.',
        ],
        sources: [
          {
            label: 'Formula 2: Fornaroli’s 2025 championship',
            url: 'https://www.fiaformula2.com/en/information/leonardo-fornaroli-2025-champion.58mcDM3UGmtXFSBwj3qPHn',
          },
          {
            label: 'Grandprix.com: Haas’s candidate testing',
            url: 'https://www.grandprix.com/news/komatsu-confirms-five-driver-fight-for-ocons-haas-seat.html',
          },
        ],
      },
      {
        heading: 'When will Haas decide?',
        paragraphs: [
          'Haas has named no date, and none appears in the reporting linked here. Komatsu’s shortlist leaves the seat open to Ocon and to the four drivers who would replace him. This guide will be updated when Haas confirms its 2027 line-up, and the five names will stay as the shortlist it considered.',
        ],
        sources: [
          {
            label: 'Grandprix.com: the selection remains open',
            url: 'https://www.grandprix.com/news/komatsu-confirms-five-driver-fight-for-ocons-haas-seat.html',
          },
        ],
      },
    ],
    liveLinks: [
      {
        to: '/f1-team-mate-battles',
        label: 'F1 teammate head-to-head results',
        detail:
          'Compare the current driver pairings, including Ocon and Bearman.',
      },
    ],
  },
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
          'A Grand Prix weekend opens with three practice sessions, two on Friday and one on Saturday morning. Nothing that happens in them affects the grid, and no points are on offer.',
          'Teams spend the time working through a programme: aerodynamic measurement runs, setup changes compared back to back, and a long run on heavy fuel to see how the tyres hold up over a stint. Final practice, an hour before qualifying, is usually the closest thing to a qualifying simulation.',
          'Fuel loads and engine modes vary from car to car and from run to run, so the practice timing screen rarely shows the real order. The lap times within a single long stint are the part that holds up, because they show how quickly a car is wearing its tyres.',
        ],
      },
      {
        heading: 'Sprint weekends',
        paragraphs: [
          'Seven rounds of the 2026 season run a sprint. One practice session makes way for sprint qualifying on Friday, which sets the grid for a short race on Saturday morning, and the weekend then picks up its usual shape with qualifying and the Grand Prix.',
          'That gives a sprint weekend four sessions worth predicting instead of two, in the order sprint qualifying, sprint, qualifying, race. The sprint itself pays points to the top eight finishers.',
        ],
      },
      {
        heading: 'Qualifying',
        paragraphs: [
          'Qualifying is one session in three parts, each shorter than the last, with the slowest cars knocked out at the end of each. Whoever survives to the final part contests pole, and the order set there becomes the front of the grid.',
          'Track conditions usually improve as rubber goes down, so the last laps of a part are normally the quickest. That leaves a driver near the cut line choosing between a clear track early and a faster surface late, and running too late can mean the flag falls before they start the lap.',
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
          'The starting grid is not always the qualifying order. Drivers take grid penalties for going beyond their season allocation of power unit parts, for gearbox changes, or as a sanction for an incident at a previous race, and those are applied after qualifying has run.',
          'A penalty never changes the qualifying classification. A driver can be third in qualifying and start the race tenth, and both of those are the official result of their session.',
        ],
      },
      {
        heading: 'Race day',
        paragraphs: [
          'The race begins with a formation lap, after which the cars line up again and the start comes when five red lights go out. The field is never closer together than it is at the first corner, and places won or lost there often shape the rest of the afternoon.',
          'After that the race is a balance of pace against tyre wear. A dry race has to be run on more than one compound, so every driver stops at least once, and when they stop is the strategy.',
          'Safety cars are the main disruption. The field bunches up behind one and a pit stop costs far less time than usual, so a driver who has not stopped yet can come out ahead of cars that spent a full stop to pass them.',
          'The Grand Prix does not always fall on Sunday. Azerbaijan races on Saturday 26 September this season, and the Las Vegas night race starts so late that its date depends on which time zone you are watching from. Session times on Grand Prix Picks are the real ones for each round, and picks for a session lock the moment that session starts.',
        ],
      },
      {
        heading: 'After the flag',
        paragraphs: [
          'The result is not final at the chequered flag. Stewards review incidents from the race and can add time penalties afterwards, which sometimes changes the classification, including the podium.',
          'Grand Prix Picks scores the official classification rather than the order the cars crossed the line, so a penalty applied hours later can still move your score. The official result is the one the championship counts.',
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
