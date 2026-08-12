/**
 * Evergreen written guides served at /guides/<slug>.
 *
 * Content lives here rather than in per-route JSX so the sitemap, the index
 * page and the article route all read from one list. Keep entries evergreen:
 * anything that depends on a single season's standings belongs on a data page
 * (/f1-standings, /leaderboard), not in a guide that nobody will remember to
 * update.
 */

type GuideSection = {
  heading: string;
  paragraphs: readonly string[];
  /** Optional definition list rendered after the paragraphs. */
  list?: readonly { term: string; detail: string }[];
};

export type Guide = {
  slug: string;
  /** H1 and index-card title. */
  title: string;
  /** <title> tag. Longer, keyword-bearing. */
  metaTitle: string;
  metaDescription: string;
  /** One-sentence standfirst under the H1 and on the index card. */
  summary: string;
  sections: readonly GuideSection[];
};

const GUIDES: readonly Guide[] = [
  {
    slug: 'f1-sprint-weekends-explained',
    title: 'How F1 sprint weekends work',
    metaTitle: 'How F1 Sprint Weekends Work | Grand Prix Picks',
    metaDescription:
      'A plain explanation of the Formula 1 sprint weekend format: the running order, how sprint qualifying differs, and what changes for a normal Grand Prix weekend.',
    summary:
      'Six times a season the schedule changes shape. Here is what actually differs, and why it matters if you are predicting results.',
    sections: [
      {
        heading: 'The short version',
        paragraphs: [
          'A normal Formula 1 weekend gives teams three practice sessions before anything counts. A sprint weekend cuts that to one, then fills the rest of the schedule with two separate competitive sessions: a short race on Saturday, and the usual qualifying session that sets the grid for Sunday.',
          'The practical consequence is that teams get roughly an hour of running before they are committed. Setup decisions that would normally be refined across Friday and Saturday morning have to be made almost immediately, and a team that guesses wrong is stuck with it for the rest of the weekend.',
        ],
      },
      {
        heading: 'The running order',
        paragraphs: [
          'A sprint weekend runs its sessions in this order. Note that sprint qualifying happens before the sprint, and that the main qualifying session sits between the sprint and the Grand Prix.',
        ],
        list: [
          {
            term: 'Free Practice 1',
            detail:
              'The only practice session of the weekend. Teams use it to complete setup work that would normally take three sessions.',
          },
          {
            term: 'Sprint Qualifying',
            detail:
              'A shortened qualifying session that sets the grid for the sprint. It does not affect the Grand Prix grid.',
          },
          {
            term: 'Sprint',
            detail:
              'A short race, roughly a third of a Grand Prix distance, with no mandatory pit stop. Points go to the leading finishers.',
          },
          {
            term: 'Qualifying',
            detail:
              'The conventional three-part qualifying session, setting the grid for Sunday exactly as it would on any other weekend.',
          },
          {
            term: 'Grand Prix',
            detail:
              'The full-length race, worth full championship points, unchanged from a normal weekend.',
          },
        ],
      },
      {
        heading: 'Why the sprint changes the racing',
        paragraphs: [
          'The sprint is short enough that tyre management barely applies. Drivers can push from the start, which produces a different kind of race to a Grand Prix: fewer strategic layers, more direct wheel-to-wheel racing, and less opportunity to recover from a poor start.',
          'That also means the sprint result is a weaker predictor of the Grand Prix than people expect. A car that is quick over a short burst is not necessarily the car that will still be quick fifty laps later, and the sprint tells you almost nothing about how a team will manage a long stint.',
          'The other effect is risk. A sprint is an extra opportunity to damage a car, and damage sustained on Saturday has to be repaired before qualifying. Incidents in the sprint have knock-on consequences that a normal weekend simply does not have.',
        ],
      },
      {
        heading: 'What it means for your predictions',
        paragraphs: [
          'On Grand Prix Picks, every session of a sprint weekend is scored separately, which means a sprint weekend is worth substantially more points than a regular one. There are four scoreable sessions instead of two: sprint qualifying, the sprint, qualifying and the race.',
          'Two habits help. First, do not simply copy your Grand Prix picks across all four sessions. Sprint qualifying rewards raw single-lap pace on a green, evolving track, while the race rewards tyre management, and those are not always the same drivers.',
          'Second, remember that the field is less settled on a sprint weekend. With only one practice session, teams arrive at sprint qualifying with less information than usual, and drivers who are good at extracting a lap from an unfamiliar car balance tend to over-perform relative to their season average.',
        ],
      },
    ],
  },
  {
    slug: 'f1-points-system-explained',
    title: 'The F1 points system explained',
    metaTitle: 'F1 Points System Explained | Grand Prix Picks',
    metaDescription:
      'How Formula 1 championship points work: the scoring positions for a Grand Prix, sprint points, the constructors championship, and how tie-breaks are settled.',
    summary:
      'How Formula 1 itself awards championship points, and how that differs from the way a prediction game scores you.',
    sections: [
      {
        heading: 'Grand Prix points',
        paragraphs: [
          'Championship points in Formula 1 go to the top ten finishers in a Grand Prix, on a sliding scale that rewards winning far more than it rewards a solid points finish. The gap between first and second is deliberately large, which is why a driver with more wins can lead a championship over a rival who finishes second more often.',
        ],
        list: [
          { term: '1st', detail: '25 points' },
          { term: '2nd', detail: '18 points' },
          { term: '3rd', detail: '15 points' },
          { term: '4th', detail: '12 points' },
          { term: '5th', detail: '10 points' },
          { term: '6th', detail: '8 points' },
          { term: '7th', detail: '6 points' },
          { term: '8th', detail: '4 points' },
          { term: '9th', detail: '2 points' },
          { term: '10th', detail: '1 point' },
        ],
      },
      {
        heading: 'Sprint points',
        paragraphs: [
          'Sprints award a smaller set of points to the leading finishers, on a much shallower scale than a Grand Prix. The intent is to make the sprint worth contesting without letting it distort the championship, so winning a sprint is worth meaningfully less than winning a Grand Prix.',
          'Sprint points count towards both championships in exactly the same way as Grand Prix points. They are simply added to the total.',
        ],
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
  },
  {
    slug: 'how-to-predict-f1-top-five',
    title: 'How to predict an F1 top five',
    metaTitle: 'How to Predict an F1 Top 5 | Grand Prix Picks',
    metaDescription:
      'Practical strategy for predicting Formula 1 finishing positions: what qualifying actually tells you, which signals are worth trusting, and where most predictions go wrong.',
    summary:
      'The signals worth trusting, the ones that mislead, and why the back half of your top five is where positions are won and lost.',
    sections: [
      {
        heading: 'Start with the grid, but know its limits',
        paragraphs: [
          'Qualifying position is the single strongest predictor of a Grand Prix result, and any prediction that ignores it is starting from a worse place than one that does not. Across a season, most drivers finish within a couple of positions of where they qualified.',
          'The limit is that the strength of that relationship varies enormously by circuit. At a track where overtaking is close to impossible, the grid is very nearly the result. At a circuit with long straights and heavy braking zones, a quick car starting out of position will usually recover, and the grid tells you much less.',
          'This is why it is worth reading the circuit guide on each race page before locking in picks. Knowing whether you are at a track where the order holds or a track where it scrambles changes how much you should deviate from qualifying.',
        ],
      },
      {
        heading: 'Order matters more than names',
        paragraphs: [
          'A common mistake is to pick the five drivers most likely to finish in the top five, in no particular order, and hope. Because scoring is position-sensitive, that approach leaves a lot of points on the table.',
          'Getting all five drivers right but in a scrambled order scores far less than getting four right in the correct positions. If you are confident about who will be involved but unsure of the order, think about which specific slot each driver is most likely to occupy rather than which drivers are strongest overall.',
          'The near-miss rules reward precision that is close rather than exact, so a considered guess at an exact position is usually better than hedging. There is no benefit to playing it safe with your ordering.',
        ],
      },
      {
        heading: 'Where the points actually are',
        paragraphs: [
          'The front of the grid is usually the easy part. In most seasons, one or two teams are clearly quickest, and the first two slots of a top five prediction are close to a formality for anyone paying attention.',
          'Positions three to five are where predictions separate. That is the part of the field where several teams are genuinely close, where a good qualifying lap can lift a car out of its usual range, and where tyre strategy and race pace decide the order rather than raw speed.',
          'If you have limited time to research, spend it there. Working out who is likely to be fifth is worth more than double-checking who will win.',
        ],
      },
      {
        heading: 'Signals worth trusting',
        paragraphs: [
          'Long-run practice pace is the most underrated signal available. Teams do race-simulation running in practice, and the lap times from those stints tell you far more about Sunday than a single qualifying lap does. It is public information and most people ignore it.',
          'Recent form over the last two or three weekends is generally more informative than season-long averages, because car development moves quickly and a team upgrade can shift the order permanently mid-season.',
          'Weather forecasts deserve more attention than they usually get. Rain compresses the performance gap between cars and puts far more weight on driver skill, which means a wet race is the one situation where deviating substantially from the expected order is justified.',
        ],
      },
      {
        heading: 'Signals that mislead',
        paragraphs: [
          'Last season results at the same circuit are much weaker than they feel. Cars change enormously between seasons, and a team that was strong at a given track last year may have no particular advantage there now. The circuit character persists; the competitive order does not.',
          'Sprint results are a poor guide to the Grand Prix, for the reasons covered in the sprint format guide: different distance, different tyre demands, different everything.',
          'Single practice lap times, taken in isolation, are close to meaningless. Fuel loads and engine modes are not published, so a headline practice time can reflect a car running light rather than a car running fast.',
        ],
      },
      {
        heading: 'A workable routine',
        paragraphs: [
          'Make a first draft after qualifying, based on the grid. Then adjust it for the circuit: move drivers up if overtaking is easy here and the fast cars are out of position, and leave the order close to the grid if it is not.',
          'Check the forecast. If rain is likely, widen your expectations considerably and favour drivers with a track record in changeable conditions over the fastest car.',
          'Finally, look at your positions three to five and ask whether you have simply copied the grid. If you have, and the circuit is one where the order tends to move, you are probably being too conservative in exactly the place where accuracy pays.',
        ],
      },
    ],
  },
  {
    slug: 'f1-race-weekend-format',
    title: 'What happens across an F1 race weekend',
    metaTitle: 'F1 Race Weekend Format Explained | Grand Prix Picks',
    metaDescription:
      'A session-by-session explanation of a Formula 1 race weekend: what practice is for, how the three-part qualifying session works, and what happens on race day.',
    summary:
      'A session-by-session walkthrough for anyone who wants to know what teams are actually doing on Friday.',
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
  },
];

export const GUIDE_SLUGS: readonly string[] = GUIDES.map((guide) => guide.slug);

/** All guides, in the order they should appear on the index page. */
export function listGuides(): readonly Guide[] {
  return GUIDES;
}

/** A single guide by slug, or null when the slug is unknown. */
export function getGuide(slug: string): Guide | null {
  return GUIDES.find((guide) => guide.slug === slug) ?? null;
}
