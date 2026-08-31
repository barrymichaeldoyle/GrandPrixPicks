import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

/**
 * Editorial circuit guides shown on every race page.
 *
 * Keyed by circuit slug ("silverstone", "monza"), matching
 * `@grandprixpicks/shared/circuits`. A guide describes a place, so it belongs
 * to the venue rather than to whichever Grand Prix happens to be run there in
 * a given season. A new venue needs an entry in both files.
 *
 * The 2026 cars have no DRS. The aids are straight mode and Overtake, and the
 * guides use those names. Both older terms are dead: "DRS" describes a car
 * that no longer exists, and "manual override mode" is the engineering name
 * F1 dropped in December 2025 in favour of "Overtake".
 *
 * These are deliberately qualitative. The value to someone about to rank five
 * drivers is knowing how much the order tends to move at a given track, not a
 * spec sheet they can read anywhere. Keep the voice plain and keep every claim
 * durable: anything tied to one season's form goes stale within weeks.
 */

export type CircuitGuide = {
  /** What the place is, in two or three sentences. */
  character: string;
  /** What the layout asks of the car and the driver. */
  layout: string;
  /** How much the running order actually changes on Sunday. */
  racing: string;
  /** How to approach a Top 5 prediction here. */
  predicting: string;
  /** Short qualitative chips. Judgement calls, not spec-sheet numbers. */
  traits: readonly {
    label: 'Track type' | 'Overtaking' | 'Upset risk';
    value: string;
  }[];
};

const CIRCUIT_GUIDES: Record<string, CircuitGuide> = {
  'albert-park': {
    character:
      'Albert Park is a parkland circuit that spends most of the year as public road around a lake in Melbourne. Resurfacing and a set of faster corners have moved it a long way from the stop-start layout it used to be, and it now rewards a car that can carry speed through medium-fast direction changes.',
    layout:
      'The lap flows in long sequences rather than isolated braking zones, so a driver who commits early in a corner keeps the benefit all the way to the next one. Kerbs are aggressive and the walls sit close on the exits, which punishes anyone chasing the last tenth.',
    racing:
      'The long straights and multiple straight-mode zones give a genuinely quick car a route past, but the corners in between are hard to follow through. Passes tend to happen in bursts on the run to the heavy braking zones rather than steadily across the lap.',
    predicting:
      'Being the season opener is the complication, not the track. Nobody has a reliable read on the pecking order yet, testing form is a weak signal, and reliability failures are more common here than at any other point in the year. Treat the back half of your Top 5 as the volatile part and expect at least one surprise.',
    traits: [
      { label: 'Track type', value: 'Temporary parkland' },
      { label: 'Overtaking', value: 'Moderate' },
      { label: 'Upset risk', value: 'High (season opener)' },
    ],
  },
  shanghai: {
    character:
      'Shanghai pairs one of the most distinctive corners in the sport with one of its longest straights. The opening complex spirals tighter and tighter for what feels like an age before releasing onto the infield, and getting it right sets up the entire lap.',
    layout:
      'The demands split cleanly in two: a technical opening sector that asks for front-end grip and patience, then a back straight that asks for straight-line speed. Teams have to compromise, and where they land on that compromise shapes who is quick on Saturday versus Sunday.',
    racing:
      'The hairpin at the end of the back straight is one of the best overtaking spots on the calendar, and the run down to it is long enough that a small pace advantage converts into a real move. The order changes here.',
    predicting:
      'Cars that are strong in a straight line can recover from a poor qualifying position, so the grid is a weaker guide than usual. Front tyre wear through the opening complex also tends to separate the field over a stint, which can drop a fast qualifier out of your Top 5 by the flag.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  suzuka: {
    character:
      'Suzuka is the drivers’ circuit, the one they name when asked for a favourite. It crosses over itself in a figure of eight and strings together a set of high-speed direction changes that reward bravery and expose a nervous car immediately.',
    layout:
      'The opening esses are the heart of it: a rhythmic sequence taken close to flat where every corner sets up the next, so a single mistake costs time all the way through. The rest of the lap keeps asking for high-speed stability, which favours cars with a strong aerodynamic platform.',
    racing:
      'Following closely through the esses is genuinely difficult, and the passing opportunities are limited to the run down to the final chicane and the first corner. Grid position matters more here than at most tracks.',
    predicting:
      'This is one of the calendar’s more predictable weekends: the fastest car on Saturday usually converts on Sunday, and the order rarely scrambles. Weight your Top 5 towards qualifying pace. The wildcard is weather, which turns up here more often than the calendar slot suggests.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Hard' },
      { label: 'Upset risk', value: 'Low (unless it rains)' },
    ],
  },
  miami: {
    character:
      'A temporary circuit laid out around the Hard Rock Stadium, mixing long straights with a genuinely awkward slow-speed section in the middle. It looks like a street circuit in places and a permanent track in others, which is part of why teams struggle to nail the setup.',
    layout:
      'Two long straights bookend a technical middle sector with a set of tight, badly cambered corners that are easy to get wrong. The surface offers less grip than most permanent venues and the track evolves substantially across the weekend.',
    racing:
      'The straights are long enough that a following car can use Overtake to real effect, so the order moves. Heat is the other factor: track temperatures here are punishing and tyre management often decides the closing laps.',
    predicting:
      'Expect the finishing order to differ from the grid. Cars that look quick over one lap in cool conditions can fall away when the surface heats up, so favour drivers with a reputation for looking after tyres over pure qualifying specialists.',
    traits: [
      { label: 'Track type', value: 'Temporary' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  'gilles-villeneuve': {
    character:
      'Circuit Gilles Villeneuve runs along an island in the St Lawrence, a low-grip, stop-start layout of straights joined by heavy braking zones and chicanes. It ends with the run past the wall that has caught out more than one world champion.',
    layout:
      'Traction and braking stability dominate. There are very few genuine corners, so the lap comes down to how well a car stops, turns through a chicane and fires out the other side without spinning the rear tyres. Kerb riding matters enormously.',
    racing:
      'The hairpin onto the back straight is a classic passing move and the walls make errors expensive, which is a productive combination. Safety cars are common, and they reshuffle strategy more decisively here than almost anywhere.',
    predicting:
      'One of the higher-variance weekends of the season. Between the safety car probability, the low grip and the proximity of the walls, drivers finish here who had no business being in contention on Saturday. Leave room in the back half of your Top 5 for someone out of position.',
    traits: [
      { label: 'Track type', value: 'Temporary parkland' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'High' },
    ],
  },
  monaco: {
    character:
      'The slowest, narrowest and most unforgiving circuit of the year, run through the streets of Monte Carlo with barriers on both sides for the entire lap. It has been on the calendar since the beginning and it makes no concession whatsoever to modern car dimensions.',
    layout:
      'There is no margin anywhere. The lap is a sequence of blind, cambered, wall-lined corners taken at speeds that would be unremarkable elsewhere but feel enormous with armco a few centimetres away. Mechanical grip and driver confidence outweigh aerodynamic performance.',
    racing:
      'Overtaking is close to impossible. A significantly faster car will spend an entire race stuck behind a slower one, and the only realistic route past is through the pit stops or someone else’s mistake.',
    predicting:
      'Qualifying is the race. Saturday’s order is the single best predictor of Sunday’s result anywhere on the calendar, so build your Top 5 from the grid and change very little. The one caveat is that the barriers claim someone most years, so a retirement ahead can promote a driver you had written off.',
    traits: [
      { label: 'Track type', value: 'Street' },
      { label: 'Overtaking', value: 'Very hard' },
      { label: 'Upset risk', value: 'Low, then sudden' },
    ],
  },
  barcelona: {
    character:
      'Barcelona is the circuit every team knows better than any other, having tested here for decades. That familiarity is exactly what makes it revealing: nobody has an excuse, and the finishing order tends to reflect the real order of the field.',
    layout:
      'A demanding lap with a long opening straight, a fast middle sector and a slow final section that punishes any car lacking front-end grip. Sustained high-speed corners make it the most aerodynamically demanding conventional circuit on the calendar.',
    racing:
      'Following through the fast corners costs a lot of front tyre performance, which historically made passing difficult. The removal of the old chicane restored the fast final corner and helped, but this is still a track where track position is worth defending.',
    predicting:
      'Treat this as a form guide. If a car is genuinely fast, it will show here, and the result is usually a clean reflection of underlying pace with few surprises. It is one of the safer weekends to back the established order across all five slots.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Moderate' },
      { label: 'Upset risk', value: 'Low' },
    ],
  },
  'red-bull-ring': {
    character:
      'The Red Bull Ring is short, simple and set in the Styrian hills, with a lap time so brief that the entire field can be covered by a couple of seconds. Its simplicity is deceptive: the elevation change is severe and the margins are tiny.',
    layout:
      'A handful of corners joined by uphill straights, which puts power and traction at a premium. The climb out of the first corner and the run to the top of the hill reward engine performance, while the downhill final sector is quicker and more flowing than it looks on a map.',
    racing:
      'Multiple straight-mode zones and heavy braking zones at the end of uphill straights make this a strong overtaking venue. Track limits at the exit of the final corners are a recurring source of deleted lap times and post-race penalties.',
    predicting:
      'Because the lap is so short, qualifying gaps compress and small errors are magnified. Expect a grid that does not fully reflect race pace, and expect track limits penalties to move the classification after the flag. Genuinely one of the harder weekends to call precisely.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  silverstone: {
    character:
      'Silverstone is fast, open and exposed, built on a former airfield where the wind comes from every direction and the weather can change within a single stint. Maggotts and Becketts is one of the great sequences in motorsport.',
    layout:
      'Sustained high-speed direction changes dominate, so aerodynamic load and stability under lateral load decide the lap. Cars that are nervous at the rear are found out immediately, and tyre loading through the fast sequences is among the highest of the year.',
    racing:
      'Wide track, long straights and generous run-off make this a good place to pass, and the racing is usually close. Weather is the great disruptor: a passing shower over one part of the circuit can upend the order entirely.',
    predicting:
      'Solid form guide in dry conditions, chaos in mixed conditions, and mixed conditions are common. Check the forecast before committing. If rain is anywhere in it, favour drivers who reliably outperform their machinery rather than the fastest car.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'Weather dependent' },
    ],
  },
  spa: {
    character:
      'Spa-Francorchamps is the longest lap of the season, cut through the Ardennes forest with enormous elevation change and the most famous corner in the sport at Eau Rouge and Raidillon. Its scale is the point: a lap here takes noticeably longer than anywhere else.',
    layout:
      'The circuit splits into a power-hungry first sector, a fast and technical middle section, and a final run back to the line. Teams must choose between straight-line speed and middle-sector downforce, and that choice determines where they are strong.',
    racing:
      'The long straight after Eau Rouge is one of the best passing opportunities anywhere, and a car with a low-drag setup can carve through the field. Grid penalties are common here because teams take engine components knowing they can recover positions.',
    predicting:
      'The grid is an unusually poor guide, both because overtaking is easy and because penalties routinely reshuffle it. Localised weather is the other factor: the circuit is long enough to be wet at one end and dry at the other. High variance, and worth building a Top 5 around race pace rather than Saturday.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Very good' },
      { label: 'Upset risk', value: 'High' },
    ],
  },
  hungaroring: {
    character:
      'The Hungaroring is tight, twisty and relentless, often described as a street circuit without the walls. It sits in a natural bowl outside Budapest and is traditionally one of the hottest races of the year.',
    layout:
      'Corner follows corner with barely a straight to recover, which makes this a downforce circuit above all else. Mechanical grip and a responsive front end matter more than engine performance, and the driver never gets a rest.',
    racing:
      'Passing is genuinely hard. The main straight offers the only realistic opportunity and the corners are too tight to follow closely through, so races here are frequently decided in the pit lane rather than on track.',
    predicting:
      'Closer to Monaco than to Spa in terms of how much the grid tells you. Qualifying position carries a lot of weight, and a car that qualifies out of position will usually stay there. Heat and tyre degradation are the main reasons the order shifts.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Hard' },
      { label: 'Upset risk', value: 'Low' },
    ],
  },
  zandvoort: {
    character:
      'Zandvoort runs through the coastal dunes north of Amsterdam, an old-school circuit brought back to the calendar with steep banking added at two corners. The 2026 Dutch Grand Prix was its final Formula 1 race, ending a six-year modern run after the promoters chose not to renew amid rising hosting and operational costs. The circuit itself remains active, with Formula E planned from 2027.',
    layout:
      'The banking at Hugenholtz and at the final corner lets cars carry far more speed than a flat equivalent would allow, and it changes how the car has to be set up. The lap is short and flowing with very little respite, and the surface offers less grip when sand blows in off the dunes.',
    racing:
      'Narrow and difficult to pass on. The banked final corner feeds directly onto the main straight, which sets up a following car for the run to Turn 1, but there is not much space anywhere else.',
    predicting:
      'Qualifying matters and the field tends to stay in order, so build from the grid. Sand on the racing line and the narrow confines mean incidents are not rare, and a safety car has an outsized effect on a circuit where nobody can pass.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Hard' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  monza: {
    character:
      'Monza is the Temple of Speed: a 5.793-kilometre sequence of long straights, heavy braking zones and fast corners inside the royal park north-east of Milan. Drivers spend about 80% of the lap at full throttle, and the 1.1-kilometre main straight helps make this one of Formula 1’s fastest circuits.',
    layout:
      'Teams bring their lowest-downforce package, but headline top speed is only part of the problem: the car still needs to stay settled under very heavy braking and find traction out of slow chicanes. Monza was fully resurfaced and its kerbs rebuilt before the 2024 race, leaving a smoother track and changing how drivers attack the chicanes and Ascari.',
    racing:
      'The slipstream matters in qualifying and the race. Rettifilo, the first chicane at the end of the main straight, is the clearest overtaking opportunity and a first-lap pinch point; Roggia provides another heavy braking zone, but a poor exit from either chicane can undo the move.',
    predicting:
      'Do not reduce Monza form to engine power. Prioritise straight-line efficiency, braking confidence, traction and balance in the low-downforce setup. Qualifying still matters, but tow and traffic can distort the margins, while the first-chicane squeeze raises the opening-lap risk. Compare long-run pace and speed-trap data before making a marginal pick.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  madring: {
    character:
      'Madring makes its Formula 1 debut in 2026 as a 5.416-kilometre, 22-corner circuit around the IFEMA exhibition complex in north-east Madrid. It combines public roads with purpose-built sections, so one lap moves between a street-circuit feel and the elevation changes and fast sweepers of a permanent track.',
    layout:
      'The 1.3-kilometre longest straight and several heavy stops reward straight-line speed and braking stability, while the near-flat Valdebebas sequence asks for high-speed balance. Turn 12, La Monumental, is the signature: a 550-metre corner with 24% banking, approached at high speed and followed by heavy braking for Turn 13.',
    racing:
      'The organisers identify Turns 1, 13 and 17 as overtaking opportunities, with large speed reductions at the latter two. La Monumental may also help a following car build a tow before Turn 13. Those ingredients are promising, but no Formula 1 race has yet shown whether cars can follow closely through the fast sections, so treat overtaking claims as unproven.',
    predicting:
      'Treat this as the highest-uncertainty weekend on the calendar. There is no historical form, tyre-degradation pattern or proven overtaking baseline, and teams begin with simulation rather than race data. Give practice more weight than usual: watch braking confidence, pace through the fast linked corners, long-run tyre behaviour and how quickly each team adapts as the new surface evolves.',
    traits: [
      { label: 'Track type', value: 'Street and permanent mix' },
      { label: 'Overtaking', value: 'Promising, unproven' },
      { label: 'Upset risk', value: 'High (new circuit)' },
    ],
  },
  baku: {
    character:
      'Baku pairs one of the longest flat-out runs in the championship with a section threaded between the walls of the old city that is barely wider than a car and a half. That combination makes it one of the most unpredictable races of the year.',
    layout:
      'A low-downforce setup helps down the enormous main straight but hurts through the twisting castle section, and teams have to pick a side. The walls are close for most of the lap and the surface offers little grip.',
    racing:
      'The main straight is long enough that a slipstream plus Overtake is close to unbeatable, so positions change constantly and defending is very hard. Safety cars are near-inevitable given how close the barriers are.',
    predicting:
      'One of the genuinely chaotic weekends. Results here regularly feature drivers well outside their usual range, and the grid tells you comparatively little. If you are going to take a risk on an outside pick anywhere on the calendar, this is a reasonable place to do it.',
    traits: [
      { label: 'Track type', value: 'Street' },
      { label: 'Overtaking', value: 'Very good' },
      { label: 'Upset risk', value: 'Very high' },
    ],
  },
  sepang: {
    character:
      'Sepang is a Hermann Tilke design from 1999 that hosted Formula 1 until 2017, and it returns as the venue for a Grand Prix carrying another country\u2019s name. It is a proper permanent circuit with generous run-off, enormous width and a surface that has aged into something abrasive. Heat and humidity sit close to Singapore levels, but here they are endured in daylight.',
    layout:
      'Two very long straights joined by a hairpin give the lap its shape, and either side of them is a sequence of fast, wide, constant-radius corners that reward a car with aerodynamic load at speed. The width is the defining feature: there is almost always more than one line through a corner, and a driver can commit to an unusual entry without being punished for it.',
    racing:
      'Among the easier tracks on the calendar to pass on. The braking zones at the end of both straights are heavy and wide enough to permit a move that goes slightly wrong, so drivers attempt passes here that they would not risk elsewhere. Tyre degradation on the abrasive surface is high, which spreads strategies apart, and tropical afternoon rain is a genuine and frequent possibility rather than a footnote.',
    predicting:
      'This is one of the least sticky rounds you will predict all year. Qualifying matters less than usual because the layout genuinely allows recovery, degradation opens up strategy, and the chance of a downpour rearranging everything is real. Nobody on the current grid has raced a Grand Prix here, so track-specific form is no guide. Lean on outright car pace over qualifying position, and treat the lower half of your Top 5 as close to a coin toss.',
    traits: [
      { label: 'Track type', value: 'Permanent (tropical)' },
      { label: 'Overtaking', value: 'Easy' },
      { label: 'Upset risk', value: 'High' },
    ],
  },
  'marina-bay': {
    character:
      'A night race through the streets of Singapore, run in heat and humidity that make it the most physically demanding event of the season. Drivers routinely lose several kilograms across the race distance.',
    layout:
      'A long lap with a high corner count, bumpy surface and walls throughout. Mechanical grip and traction out of slow corners dominate, and the humidity keeps cockpit temperatures brutal for the full two hours.',
    racing:
      'Historically very difficult to pass on, though layout revisions have improved it somewhat. This is a track where track position is defended successfully and where the race often runs close to the two-hour limit.',
    predicting:
      'Qualifying position is important and the order is relatively sticky, but the safety car probability here is among the highest of the season and a well-timed one can rewrite the result. Driver fitness and concentration late in the race genuinely matter, so consider who tends to hold up under sustained pressure.',
    traits: [
      { label: 'Track type', value: 'Street (night)' },
      { label: 'Overtaking', value: 'Hard' },
      { label: 'Upset risk', value: 'Medium to high' },
    ],
  },
  cota: {
    character:
      'Circuit of the Americas in Austin borrows ideas from several classic circuits, most obviously in the steep uphill run to the first corner and a fast esses sequence inspired by Silverstone. It has become notably bumpy as the ground has settled.',
    layout:
      'A varied lap that asks for a bit of everything: a heavy braking zone into turn one, high-speed changes of direction through the early esses, a long back straight and a slow, technical final sector. Ride quality over the bumps has become a real differentiator.',
    racing:
      'Two good passing zones and a wide track make for solid racing. The blind, uphill run to the first corner is the standout moment: drivers arrive without a clear view of the apex, the track is wide enough for three cars to try it at once, and first-lap position changes here are routine. The back straight offers the more conventional overtaking opportunity later in the race.',
    predicting:
      'A reasonably honest circuit where the quicker cars generally come through, so the grid is a decent starting point. The bumps are the variable: teams that cannot run their preferred ride height here sometimes underperform their season form.',
    traits: [
      { label: 'Track type', value: 'Permanent' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  'mexico-city': {
    character:
      'Mexico City sits well over two kilometres above sea level, and the thin air changes everything. Cars run maximum downforce configurations yet still behave as though they have very little, because there is simply less air to work with.',
    layout:
      'The altitude reduces aerodynamic grip and makes cooling a serious engineering problem, so teams open up bodywork at a cost to drag. The main straight is enormous, top speeds are the highest of the year, and the stadium section at the end of the lap is slow and tight.',
    racing:
      'The long straight into a heavy braking zone is a strong overtaking spot, and the low grip at the first corner produces regular first-lap incidents. Braking performance suffers in the thin air, which contributes.',
    predicting:
      'Cooling limitations affect teams unevenly, and a car that is comfortable everywhere else can struggle here specifically. Combined with the low-grip first corner, that makes the order less predictable than the circuit layout alone would suggest.',
    traits: [
      { label: 'Track type', value: 'Permanent (high altitude)' },
      { label: 'Overtaking', value: 'Good' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  interlagos: {
    character:
      'Interlagos runs anticlockwise over a compact, hilly site in São Paulo, and it has produced more memorable races than almost anywhere on the calendar. The lap is short, the crowd is enormous and the weather is famously unreliable.',
    layout:
      'A steep climb, a fast downhill plunge into the Senna S and a long uphill run back to the line. The anticlockwise direction loads the drivers’ necks the other way and the bumpy surface makes the cars work hard.',
    racing:
      'Excellent. The uphill run to the line and the descent into the Senna S both produce passes, and the short lap keeps cars in contact with each other. Sudden heavy rain is a regular feature.',
    predicting:
      'High variance and historically prone to dramatic finishes. Weather is the dominant factor: if there is rain in the forecast, discount qualifying position heavily and back drivers who are strong in changeable conditions. Even dry, the racing here moves the order more than most.',
    traits: [
      { label: 'Track type', value: 'Permanent (anticlockwise)' },
      { label: 'Overtaking', value: 'Very good' },
      { label: 'Upset risk', value: 'High' },
    ],
  },
  'las-vegas': {
    character:
      'A night race down the Las Vegas Strip, run in the coldest conditions of the season on a fast, low-downforce street layout. The combination of cold ambient temperatures and a street surface creates a tyre problem unlike anywhere else.',
    layout:
      'Very long straights joined by slow corners, so teams run minimal downforce and top speeds are among the highest of the year. The defining difficulty is getting tyres into their working range at all: in near-freezing night conditions, warming them up is harder than managing wear.',
    racing:
      'The long straights make passing straightforward and slipstreaming is a significant factor. Cold tyres and a slippery surface produce lock-ups and off-track excursions throughout the weekend.',
    predicting:
      'Tyre warm-up is the story. Cars that struggle to switch tyres on can be uncompetitive here regardless of their season form, and drivers make more mistakes than usual on cold rubber. Safety cars are likely. Treat this as one of the less predictable weekends.',
    traits: [
      { label: 'Track type', value: 'Street (night)' },
      { label: 'Overtaking', value: 'Very good' },
      { label: 'Upset risk', value: 'High' },
    ],
  },
  lusail: {
    character:
      'Lusail is a fast, flowing circuit originally built for motorcycle racing, which shows in its wide, sweeping corners and near-total absence of slow sections. It is run at night and remains punishingly hot even after dark.',
    layout:
      'An almost continuous sequence of medium and high-speed corners with very little straight-line respite. That loads the tyres more heavily and more constantly than anywhere else on the calendar, and aggressive kerbs add to the stress.',
    racing:
      'The high-speed nature makes following difficult, though the main straight offers a passing opportunity. The bigger factor is that tyre life is severely limited here, which forces teams into more pit stops than they would otherwise choose and can compress or spread the field artificially. Races here are frequently decided by who can complete a stint without falling off a performance cliff rather than by outright pace.',
    predicting:
      'Tyre management dominates and the physical demands on drivers are extreme. A quick car that cannot look after its tyres will not convert here. The grid is a moderate guide at best; race pace over a stint is the better signal.',
    traits: [
      { label: 'Track type', value: 'Permanent (night)' },
      { label: 'Overtaking', value: 'Moderate' },
      { label: 'Upset risk', value: 'Medium' },
    ],
  },
  'yas-marina': {
    character:
      'Yas Marina closes the season at dusk, starting in daylight and finishing under lights as the track cools and grip improves. Layout revisions removed the tightest sections and opened the circuit up considerably.',
    layout:
      'Long straights into slow corners in the first half, then a faster, more flowing run around the marina. The changing track temperature across the event means the car that is quick at the start of the race is not always the one that is quick at the end.',
    racing:
      'Improved substantially since the layout was revised, with the banked corner and the long straights giving following cars a genuine chance. Still not the easiest place to pass, but no longer the procession it once was.',
    predicting:
      'A fairly honest circuit where the season’s established order usually holds, making it one of the safer weekends for a conventional Top 5. The complication is motivation and circumstance: championships are often already settled, and teams sometimes run experimental setups with next season in mind.',
    traits: [
      { label: 'Track type', value: 'Permanent (dusk)' },
      { label: 'Overtaking', value: 'Moderate' },
      { label: 'Upset risk', value: 'Low' },
    ],
  },
};

/**
 * Circuit guide for a race, resolved through the circuit it is run on.
 * Null for a venue with no entry yet.
 *
 * @param raceSlug — a race slug, with or without its season suffix
 */
export function getCircuitGuide(raceSlug: string): CircuitGuide | null {
  const circuit = getCircuitForRace(raceSlug);
  return circuit ? getCircuitGuideBySlug(circuit.slug) : null;
}

/**
 * Every circuit slug that has a guide, read from the guides themselves.
 *
 * For tests and tooling. Application code that only needs to know whether a
 * guide exists should use `hasCircuitGuide` from `circuitGuideSlugs.ts`:
 * calling this one imports all of the writing.
 */
export function listCircuitGuideSlugs(): string[] {
  return Object.keys(CIRCUIT_GUIDES);
}

/** The guide for a circuit, by circuit slug. */
export function getCircuitGuideBySlug(
  circuitSlug: string,
): CircuitGuide | null {
  return CIRCUIT_GUIDES[circuitSlug.toLowerCase()] ?? null;
}
