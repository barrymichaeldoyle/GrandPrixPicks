/**
 * The 2027 Formula 1 driver line-up, seat by seat.
 *
 * Hand-maintained reference data, in the same spirit as `/f1-2027-calendar`:
 * nothing here comes from the game's own tables, because a seat for next
 * season is not a fact this backend holds. Every row therefore has to survive
 * being read months later, which is why a seat carries a `status` the reader
 * can act on rather than a yes/no, and why `note` says what the status is
 * based on instead of asserting an outcome.
 *
 * When a seat is announced: move it to `signed`, rewrite the note to name the
 * announcement and its date, drop the driver from any `contenders` list, and
 * bump {@link LINE_UP_2027_REVIEWED_AT}. The reviewed date is the page's
 * honesty stamp and the sitemap's `lastmod`; a data edit without it tells a
 * crawler nothing changed.
 */

/**
 * How firm a seat is.
 *
 * Three states, because that is how many distinctions a reader can act on:
 * the team has said so, the team has not said so but holds the paperwork, or
 * there is no 2027 paperwork at all. "Out of contract" is deliberately not
 * called "open" — Alonso's seat is his to leave and Ocon's is his to lose,
 * and neither is a vacancy anyone else can simply take.
 */
export type SeatStatus = 'signed' | 'expected' | 'out-of-contract';

export const SEAT_STATUS_LABELS: Record<SeatStatus, string> = {
  signed: 'Signed',
  expected: 'Expected',
  'out-of-contract': 'Out of contract',
};

export type Seat = {
  /** The driver holding or contesting the seat, as they are billed on a grid. */
  driver: string;
  status: SeatStatus;
  /** What the status rests on. One sentence, dated where a date exists. */
  note: string;
};

export type TeamLineUp = {
  /** Matches a key in `TEAM_COLORS`, so the colour bar needs no second list. */
  team: string;
  seats: [Seat, Seat];
};

/** Bumped by hand whenever the seats below are re-checked against reporting. */
export const LINE_UP_2027_REVIEWED_AT = '2026-09-05';

/** For prose. Kept next to the ISO date so the two cannot drift apart. */
export const LINE_UP_2027_REVIEWED_LABEL = '5 September 2026';

/**
 * Alphabetical by team. A championship order would be more flattering and
 * would go stale every Sunday; this page is looked up, not read top to bottom,
 * and a reader scanning for one team should not have to know where it sits.
 */
export const LINE_UP_2027: TeamLineUp[] = [
  {
    team: 'Alpine',
    seats: [
      {
        driver: 'Pierre Gasly',
        status: 'signed',
        note: 'Under contract to the end of 2028.',
      },
      {
        driver: 'Franco Colapinto',
        status: 'signed',
        note: 'Extended on 27 August 2026, which made Alpine the first team with both 2027 seats announced.',
      },
    ],
  },
  {
    team: 'Aston Martin',
    seats: [
      {
        driver: 'Lance Stroll',
        status: 'expected',
        note: 'No 2027 announcement, and no sign the team is looking. His father owns it.',
      },
      {
        driver: 'Fernando Alonso',
        status: 'out-of-contract',
        note: 'His deal ends with this season and he has set no deadline for deciding. He says he stays at Aston Martin in some role either way.',
      },
    ],
  },
  {
    team: 'Audi',
    seats: [
      {
        driver: 'Nico Hulkenberg',
        status: 'expected',
        note: 'His 2024 deal carries a 2027 option, and both sides speak as though it is being taken.',
      },
      {
        driver: 'Gabriel Bortoleto',
        status: 'signed',
        note: 'Says his contract covers 2027 and the years after it, with no performance clauses in it.',
      },
    ],
  },
  {
    team: 'Cadillac',
    seats: [
      {
        driver: 'Sergio Perez',
        status: 'signed',
        note: "Signed a multi-year deal for the team's first season, covering 2027.",
      },
      {
        driver: 'Valtteri Bottas',
        status: 'signed',
        note: 'Signed alongside Perez on the same multi-year terms.',
      },
    ],
  },
  {
    team: 'Ferrari',
    seats: [
      {
        driver: 'Charles Leclerc',
        status: 'signed',
        note: 'Under contract well beyond 2027.',
      },
      {
        driver: 'Lewis Hamilton',
        status: 'signed',
        note: 'Said in Canada in June 2026 that his deal runs to at least the end of 2027.',
      },
    ],
  },
  {
    team: 'Haas',
    seats: [
      {
        driver: 'Oliver Bearman',
        status: 'expected',
        note: 'Haas holds a one-year option on him for 2027 and is expected to take it. He is reported to have turned down Aston Martin.',
      },
      {
        driver: 'Esteban Ocon',
        status: 'out-of-contract',
        note: 'Haas can extend him for a third year but has opened the seat to four other drivers instead.',
      },
    ],
  },
  {
    team: 'McLaren',
    seats: [
      {
        driver: 'Lando Norris',
        status: 'signed',
        note: 'Under contract past 2027 on the long-term deal he signed in 2025.',
      },
      {
        driver: 'Oscar Piastri',
        status: 'signed',
        note: 'Under contract to the end of 2028.',
      },
    ],
  },
  {
    team: 'Mercedes',
    seats: [
      {
        driver: 'George Russell',
        status: 'expected',
        note: 'His October 2025 extension is understood to run past 2026, but Mercedes has only ever announced him for this season.',
      },
      {
        driver: 'Kimi Antonelli',
        status: 'expected',
        note: 'Extended at the same time as Russell, and announced in the same words: 2026 only.',
      },
    ],
  },
  {
    team: 'Racing Bulls',
    seats: [
      {
        driver: 'Liam Lawson',
        status: 'expected',
        note: 'No 2027 deal. Red Bull is leaning towards keeping both of its current juniors.',
      },
      {
        driver: 'Arvid Lindblad',
        status: 'expected',
        note: 'No 2027 deal. The pressure on both seats is Nikola Tsolov, who leads Formula 2.',
      },
    ],
  },
  {
    team: 'Red Bull Racing',
    seats: [
      {
        driver: 'Max Verstappen',
        status: 'signed',
        note: 'Extended to the end of 2030 on 20 August 2026, four days before his home race.',
      },
      {
        driver: 'Isack Hadjar',
        status: 'expected',
        note: 'No 2027 deal signed. Red Bull has said an extension is close.',
      },
    ],
  },
  {
    team: 'Williams',
    seats: [
      {
        driver: 'Alex Albon',
        status: 'signed',
        note: 'Confirmed for 2027 on the eve of the Dutch Grand Prix.',
      },
      {
        driver: 'Carlos Sainz',
        status: 'signed',
        note: 'Confirmed in the same announcement, ending the Audi rumours around him.',
      },
    ],
  },
];

/**
 * The drivers Haas is choosing between for the seat Ocon currently holds.
 *
 * Ordered as Ayao Komatsu framed it on 4 September 2026: the incumbent first,
 * then the four being measured against him. `claim` is why the driver is in
 * the room, which is the only part of this that stays true whoever wins.
 */
export const HAAS_2027_CONTENDERS = [
  {
    driver: 'Esteban Ocon',
    claim:
      'Holds the seat, has won a Grand Prix, and knows the team. Ollie Bearman has beaten him on both Saturdays and Sundays this season.',
  },
  {
    driver: 'Ryo Hirakawa',
    claim:
      'Seven Friday practice runs for Haas already, a world endurance title, and Toyota behind him. Toyota is a Haas partner.',
  },
  {
    driver: 'Leonardo Fornaroli',
    claim:
      "The 2025 Formula 2 champion and McLaren's reserve. A letter of intent exists that would let Haas take him on loan.",
  },
  {
    driver: 'Rafael Camara',
    claim: 'Ferrari academy, third in Formula 2, and Haas runs Ferrari power.',
  },
  {
    driver: 'Jack Doohan',
    claim:
      'The Haas reserve, with 2025 races for Alpine behind him and a private test of his own.',
  },
] as const;

export type SeatCounts = Record<SeatStatus, number>;

/** How many of the 22 seats sit in each state. Derived, never written down. */
export function countSeats(lineUp: TeamLineUp[] = LINE_UP_2027): SeatCounts {
  const counts: SeatCounts = { signed: 0, expected: 0, 'out-of-contract': 0 };
  for (const { seats } of lineUp) {
    for (const seat of seats) {
      counts[seat.status] += 1;
    }
  }
  return counts;
}

/** Total seats on the grid, from the data rather than from the number 22. */
export function totalSeats(lineUp: TeamLineUp[] = LINE_UP_2027): number {
  return lineUp.length * 2;
}
