/**
 * The 2027 Formula 1 calendar, round by round.
 *
 * Hand-maintained reference data, the sibling of `lineUp2027.ts`. The season
 * is not in the game's own tables until the rounds are seeded, so until then
 * this file is where the dates live and where a re-check happens.
 *
 * The FIA World Motor Sport Council approved the list on 16 September 2026 and
 * Formula 1 published it the same day, so these are official dates rather than
 * reporting. They can still move: a ratified calendar is amended most years.
 * When one does, edit the round here and bump
 * {@link CALENDAR_2027_REVIEWED_AT}, which is the page's honesty stamp and the
 * sitemap's `lastmod`.
 */

export type Round2027 = {
  round: number;
  /**
   * The slug the round will carry when the season is seeded, and the key the
   * shared `raceCountries` map reads for a flag. Written here rather than
   * derived from `name`, because a flag belongs to the Grand Prix and the two
   * come apart often enough to be worth stating.
   */
  slug: string;
  /** As Formula 1 bills the event, without the "Grand Prix" suffix. */
  name: string;
  /** Circuit and city, because half these names are countries. */
  venue: string;
  /** The printed range, first session day to race day. */
  dates: string;
  /** Race day, ISO. Kept beside the label so the two cannot drift. */
  raceDate: string;
  /** Sprint weekends run sprint qualifying and a sprint before the usual two. */
  sprint: boolean;
};

/** Bumped by hand whenever the rounds below are re-checked against F1. */
export const CALENDAR_2027_REVIEWED_AT = '2026-09-17';

/** For prose. Kept next to the ISO date so the two cannot drift apart. */
export const CALENDAR_2027_REVIEWED_LABEL = '17 September 2026';

/** The day the FIA approved the calendar and Formula 1 published it. */
export const CALENDAR_2027_ANNOUNCED_LABEL = '16 September 2026';

export const CALENDAR_2027: Round2027[] = [
  {
    round: 1,
    slug: 'bahrain',
    name: 'Bahrain',
    venue: 'Bahrain International Circuit, Sakhir',
    dates: '12–14 March',
    raceDate: '2027-03-14',
    sprint: true,
  },
  {
    round: 2,
    slug: 'saudi-arabia',
    name: 'Saudi Arabian',
    venue: 'Jeddah Corniche Circuit, Jeddah',
    dates: '19–21 March',
    raceDate: '2027-03-21',
    sprint: false,
  },
  {
    round: 3,
    slug: 'australia',
    name: 'Australian',
    venue: 'Albert Park, Melbourne',
    dates: '2–4 April',
    raceDate: '2027-04-04',
    sprint: true,
  },
  {
    round: 4,
    slug: 'japan',
    name: 'Japanese',
    venue: 'Suzuka',
    dates: '9–11 April',
    raceDate: '2027-04-11',
    sprint: true,
  },
  {
    round: 5,
    slug: 'china',
    name: 'Chinese',
    venue: 'Shanghai International Circuit',
    dates: '16–18 April',
    raceDate: '2027-04-18',
    sprint: false,
  },
  {
    round: 6,
    slug: 'miami',
    name: 'Miami',
    venue: 'Miami International Autodrome',
    dates: '30 April – 2 May',
    raceDate: '2027-05-02',
    sprint: false,
  },
  {
    round: 7,
    slug: 'canada',
    name: 'Canadian',
    venue: 'Circuit Gilles Villeneuve, Montréal',
    dates: '21–23 May',
    raceDate: '2027-05-23',
    sprint: true,
  },
  {
    round: 8,
    slug: 'monaco',
    name: 'Monaco',
    venue: 'Circuit de Monaco',
    dates: '4–6 June',
    raceDate: '2027-06-06',
    sprint: true,
  },
  {
    round: 9,
    slug: 'portugal',
    name: 'Portuguese',
    venue: 'Algarve International Circuit, Portimão',
    dates: '18–20 June',
    raceDate: '2027-06-20',
    sprint: false,
  },
  {
    round: 10,
    slug: 'britain',
    name: 'British',
    venue: 'Silverstone',
    dates: '2–4 July',
    raceDate: '2027-07-04',
    sprint: true,
  },
  {
    round: 11,
    slug: 'austria',
    name: 'Austrian',
    venue: 'Red Bull Ring, Spielberg',
    dates: '9–11 July',
    raceDate: '2027-07-11',
    sprint: false,
  },
  {
    round: 12,
    slug: 'belgium',
    name: 'Belgian',
    venue: 'Spa-Francorchamps',
    dates: '23–25 July',
    raceDate: '2027-07-25',
    sprint: false,
  },
  {
    round: 13,
    slug: 'hungary',
    name: 'Hungarian',
    venue: 'Hungaroring, Budapest',
    dates: '30 July – 1 August',
    raceDate: '2027-08-01',
    sprint: false,
  },
  {
    round: 14,
    slug: 'italy',
    name: 'Italian',
    venue: 'Monza',
    dates: '3–5 September',
    raceDate: '2027-09-05',
    sprint: true,
  },
  {
    round: 15,
    slug: 'spain',
    name: 'Spanish',
    venue: 'Madring, Madrid',
    dates: '10–12 September',
    raceDate: '2027-09-12',
    sprint: false,
  },
  {
    round: 16,
    slug: 'azerbaijan',
    name: 'Azerbaijan',
    venue: 'Baku City Circuit',
    dates: '24–26 September',
    raceDate: '2027-09-26',
    sprint: false,
  },
  {
    round: 17,
    slug: 'turkiye',
    name: 'Türkiye',
    venue: 'Istanbul Park',
    dates: '1–3 October',
    raceDate: '2027-10-03',
    sprint: false,
  },
  {
    round: 18,
    slug: 'singapore',
    name: 'Singapore',
    venue: 'Marina Bay Street Circuit',
    dates: '8–10 October',
    raceDate: '2027-10-10',
    sprint: false,
  },
  {
    round: 19,
    slug: 'usa',
    name: 'United States',
    venue: 'Circuit of the Americas, Austin',
    dates: '22–24 October',
    raceDate: '2027-10-24',
    sprint: false,
  },
  {
    round: 20,
    slug: 'mexico',
    name: 'Mexico City',
    venue: 'Autódromo Hermanos Rodríguez',
    dates: '29–31 October',
    raceDate: '2027-10-31',
    sprint: false,
  },
  {
    round: 21,
    slug: 'brazil',
    name: 'São Paulo',
    venue: 'Interlagos, São Paulo',
    dates: '5–7 November',
    raceDate: '2027-11-07',
    sprint: true,
  },
  {
    round: 22,
    slug: 'las-vegas',
    name: 'Las Vegas',
    venue: 'Las Vegas Strip Circuit',
    dates: '18–20 November',
    raceDate: '2027-11-20',
    sprint: false,
  },
  {
    round: 23,
    slug: 'qatar',
    name: 'Qatar',
    venue: 'Lusail International Circuit',
    dates: '3–5 December',
    raceDate: '2027-12-05',
    sprint: true,
  },
  {
    round: 24,
    slug: 'abu-dhabi',
    name: 'Abu Dhabi',
    venue: 'Yas Marina Circuit',
    dates: '10–12 December',
    raceDate: '2027-12-12',
    sprint: true,
  },
];

/** Derived, never written down, so a round edit cannot leave a stale count. */
export function sprintRounds(
  calendar: Round2027[] = CALENDAR_2027,
): Round2027[] {
  return calendar.filter((round) => round.sprint);
}
