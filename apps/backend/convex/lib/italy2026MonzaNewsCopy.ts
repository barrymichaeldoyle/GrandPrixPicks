/** Barry-approved Monza write-up copy for italy-2026 race news (Sep 2026). */

export const COLAPINTO_ALPINE_UPGRADE_BODY =
  "Gasly was the only Alpine driver with the new floor, diffuser, sidepods and rear wing at Zandvoort. Colapinto gets the same package at Monza. Gasly was six to nine tenths quicker in Friday practice and sprint qualifying, because he had the new parts. Saturday qualifying was only about two tenths, around what Alpine thought those parts were worth. They'll both have them this weekend, so expect Gasly and Colapinto to be closer.";

export const FERRARI_ENGINE_UPGRADE_BODY =
  'Ferrari will run its ADUO2 power unit in both cars at Monza without grid penalties. Motorsport.com reports a gain of about 15 horsepower. Leclerc and Hamilton also get a more efficient rear wing and other Monza-specific changes.';

export const HADJAR_MONZA_ABSENCE_BODY =
  "Hadjar will miss a second race with the left-wrist injury that kept him out at Zandvoort. Lawson stays alongside Verstappen at Red Bull, while Tsunoda stays alongside Lindblad at Racing Bulls. Red Bull is giving Hadjar more recovery time rather than risking the wrist on Monza's kerbs.";

export const IWASA_MONZA_FP1_BODY =
  'Iwasa replaces Verstappen in FP1 as Red Bull fulfils a rookie-session requirement. Verstappen returns for FP2 and remains in the race line-up.';

export const HADJAR_DUTCH_GP_LINEUP_NOTE =
  'Isack Hadjar injured his wrist during boxing training and missed the Dutch Grand Prix. Liam Lawson stepped up to Red Bull alongside Max Verstappen, and Yuki Tsunoda took the vacated Racing Bulls seat next to Arvid Lindblad. Hadjar will also miss Monza while he continues his recovery.';

/*
 * The two FP1 seats that landed after the 2 September review.
 *
 * Written against PlanetF1 and Formula 1 respectively, and deliberately not
 * against each other: with Iwasa and Browning already published, Monza carries
 * four FP1 cards, and a first draft of these two opened with the same clause as
 * the other two. A reader meeting four near-identical paragraphs stops reading
 * the fourth. Each one now leads on the fact only it has.
 *
 * What is missing from the Aron body is on purpose. The source says both
 * Alpines run the Zandvoort upgrade package and that Aron goes to the
 * simulator afterwards; it does not say Alpine wants his read on the package,
 * and the upgrade is already its own card (`colapinto-alpine-upgrade`).
 */
export const HERTA_MONZA_FP1_BODY =
  'It is Herta’s third FP1 of the season for Cadillac, after Barcelona and Hungary. Perez is back in the car from FP2, so Friday morning is not a read on his pace.';

export const ARON_MONZA_FP1_BODY =
  'Gasly is back in the car from FP2 and the rest of the weekend. Aron then works the Enstone simulator that evening to help fine-tune the set-up.';

/*
 * The two items that were only ever published by hand, now mirrored here so
 * the whole Monza weekend is reproducible from code like the other five.
 *
 * Both lost a closing sentence addressed to the reader's picks. The write-up
 * page renders these bodies under "What changed this weekend" and is one of
 * the pages we want found, so a card reads better as reporting than as
 * instructions: the section already ends with the scoring-policy note, and
 * every card already links "How these are scored". See `docs/race-news.md`.
 */
/*
 * The Russell clause was "Mercedes plans to take that penalty at Baku rather
 * than Monza", which the card's own Motorsport.com source contradicts in its
 * headline: the venue is still open, with Baku a candidate and Sepang floated.
 * Softened 5 Sep 2026. Where Russell serves it is its own item on
 * `azerbaijan-2026`, held back from the feed until Madrid is done.
 */
export const ANTONELLI_MONZA_PENALTY_BODY =
  'Mercedes has confirmed a full power unit change for Antonelli at his home race, which is expected to put him at the back of the grid on Sunday. Russell needs the same parts at some point this season, but Mercedes has not settled on the weekend he takes that penalty.';

export const BROWNING_WILLIAMS_FP1_BODY =
  'Browning takes over Albon’s Williams for Friday morning. Albon is back in the car from FP2 and for the rest of the weekend, so FP1 is not a read on Williams pace.';

/*
 * The tow is its own card rather than a fourth sentence on the penalty item.
 * One `sourceUrl` per record, and the penalty item's Motorsport.com report
 * does not carry the Thursday quotes; it also lands on qualifying alone, where
 * the penalty item is qualifying and race.
 */
export const MERCEDES_MONZA_TOW_BODY =
  'Antonelli starts from the back with his power unit penalty, which frees him to run a tow for Russell in qualifying. Russell says Mercedes offered the plan and that they will try it, and Antonelli says he will do it if the team asks. Russell also expects a slipstream to be worth less than it once was, with the wings open in straight mode.';

/*
 * The spec of Antonelli's Monza power unit, which the penalty card cannot
 * carry: its Motorsport.com report is about when Russell takes his penalty and
 * says nothing about ADUO. One source per card, so this is its own item with
 * its own source, the same way the qualifying tow is.
 *
 * It is published because "full power unit change" reads as a performance step
 * to anyone who has met the Ferrari ADUO2 card two rows up, and a Mercedes
 * that has not gained anything this weekend is a different pick.
 */
export const ANTONELLI_MONZA_PU_SPEC_BODY =
  'The fresh power unit that sends Antonelli to the back at Monza is his fifth of the season and built to Mercedes’ current spec. Mercedes has been granted an ADUO upgrade and is holding it back: that revised spec is due in October, at Austin or Mexico City.';
