/** Dates from the official F2 and F3 announcements on 5 October 2026. */
export const SUPPORT_CALENDAR_2027_SOURCES = {
  f2: 'https://www.fiaformula2.com/en/latest/article/fia-formula-2-championship-announce-2027-season-calendar.4wnKwYRPord5JXNqtqUefN',
  f3: 'https://www.fiaformula3.com/en/latest/article/fia-formula-3-unveils-2027-calendar.2byRPUZdMVH5gh7ida48qF',
  academy: 'https://www.f1academy.com/Racing-Series/Calendar',
} as const;

type SupportRound2027 = {
  /** Matches the venue on the F1 calendar; support dates are independent. */
  slug: string;
  dates: string;
  raceDate: string;
  f2Round: number;
  f3Round?: number;
  condition?: string;
};

// F3's ten venues are all on the F2 calendar. The four-day Montréal and
// Monaco ranges are printed on both official calendar graphics.
export const SUPPORT_CALENDAR_2027: SupportRound2027[] = [
  {
    slug: 'bahrain',
    dates: '12–14 March',
    raceDate: '2027-03-14',
    f2Round: 1,
    f3Round: 1,
  },
  {
    slug: 'saudi-arabia',
    dates: '19–21 March',
    raceDate: '2027-03-21',
    f2Round: 2,
    f3Round: 2,
  },
  {
    slug: 'australia',
    dates: '2–4 April',
    raceDate: '2027-04-04',
    f2Round: 3,
    f3Round: 3,
  },
  {
    slug: 'canada',
    dates: '20–23 May',
    raceDate: '2027-05-23',
    f2Round: 4,
    f3Round: 4,
    condition: 'Subject to contract',
  },
  {
    slug: 'monaco',
    dates: '3–6 June',
    raceDate: '2027-06-06',
    f2Round: 5,
    f3Round: 5,
  },
  {
    slug: 'britain',
    dates: '2–4 July',
    raceDate: '2027-07-04',
    f2Round: 6,
    f3Round: 6,
  },
  {
    slug: 'austria',
    dates: '9–11 July',
    raceDate: '2027-07-11',
    f2Round: 7,
    f3Round: 7,
  },
  {
    slug: 'italy',
    dates: '3–5 September',
    raceDate: '2027-09-05',
    f2Round: 8,
    f3Round: 8,
  },
  {
    slug: 'spain',
    dates: '10–12 September',
    raceDate: '2027-09-12',
    f2Round: 9,
    f3Round: 9,
  },
  {
    slug: 'azerbaijan',
    dates: '24–26 September',
    raceDate: '2027-09-26',
    f2Round: 10,
  },
  {
    slug: 'turkiye',
    dates: '1–3 October',
    raceDate: '2027-10-03',
    f2Round: 11,
    f3Round: 10,
    condition: 'Subject to FIA circuit homologation',
  },
  {
    slug: 'mexico',
    dates: '29–31 October',
    raceDate: '2027-10-31',
    f2Round: 12,
  },
  { slug: 'qatar', dates: '3–5 December', raceDate: '2027-12-05', f2Round: 13 },
  {
    slug: 'abu-dhabi',
    dates: '10–12 December',
    raceDate: '2027-12-12',
    f2Round: 14,
  },
];
