import type { RaceNewsWriteUpImage } from './raceNewsWriteUpImage';
import type { StartingGridEntry } from './raceNewsStartingGrid';

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

export type SeedRaceNewsItem = {
  raceSlug: string;
  key: string;
  headline: string;
  body: string;
  affectsSessions: SessionType[];
  driverCodes?: string[];
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt?: number;
  writeUpImage?: RaceNewsWriteUpImage;
  startingGrid?: StartingGridEntry[];
};

/**
 * Monza items that prod published by hand after the earlier Italy migrations.
 * Includes the starting grid and the stories its rows link to. The ten cards
 * already mirrored in `italy2026MonzaNewsCopy.ts` stay there.
 */
export const ITALY_2026_GRID_AND_WEEKEND_NEWS: SeedRaceNewsItem[] = [
  {
    raceSlug: 'italy-2026',
    key: 'alonso-pit-lane-start',
    headline: 'Alonso starts from the pit lane at Monza',
    body: "Honda found abnormal behaviour on Alonso's power unit during Q1, which cost him a final run and left him 21st in the qualifying classification. Aston Martin changed his MGU-K, battery and control electronics overnight under parc ferme, each of them outside his season allocation, so he starts from the pit lane.",
    affectsSessions: ['race'],
    driverCodes: ['ALO'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/official-grid-who-starts-where-for-the-italian-grand-prix-2026.18oNflCZ6vMKCASJEMERzi',
    sourcePublishedAt: 1788696360000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'verstappen-rear-axle-monza',
    headline: 'Verstappen qualified with a rear axle problem',
    body: 'Verstappen said he picked up a rear axle issue at the start of qualifying, a fault Red Bull has hit repeatedly this season, and that it left the car unstable over the kerbs. He starts fifth and said the car would be in a better window on Sunday if the team can fix it overnight.',
    affectsSessions: ['race'],
    driverCodes: ['VER'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/immediately-picked-up-a-problem-verstappen-rues-red-bull-issue-in-italian-gp-qualifying.4cQz5StmDKt70RC5bLJskY',
    sourcePublishedAt: 1788624900000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'piastri-monza-grid-penalty',
    headline: 'Piastri drops to sixth on the Monza grid',
    body: 'The stewards gave Piastri a three place grid penalty for impeding Lawson on his final Q2 lap, calling it the standard penalty for the offence. He qualified third and starts sixth, with Leclerc, Hamilton and Verstappen each moving up one place. His qualifying classification is unchanged.',
    affectsSessions: ['race'],
    driverCodes: ['PIA'],
    sourceName: 'Motorsport.com',
    sourceUrl:
      'https://www.motorsport.com/f1/news/oscar-piastri-risks-losing-third-in-monza-qualifying/10852593/',
  },
  {
    raceSlug: 'italy-2026',
    key: 'lawson-grid-penalty',
    headline: 'Lawson starts from the pit lane at Monza',
    body: 'Lawson was already set for a back-of-grid start after exceeding his power unit allocation. Red Bull then changed his rear wing and suspension set-up under parc ferme overnight, which moves him to a pit lane start.',
    affectsSessions: ['race'],
    driverCodes: ['LAW'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/official-grid-who-starts-where-for-the-italian-grand-prix-2026.18oNflCZ6vMKCASJEMERzi',
    sourcePublishedAt: 1788696360000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'albon-grid-penalty',
    headline: 'Albon also starts from the back at Monza',
    body: "Williams has fitted a fifth internal combustion engine and a fourth control electronics unit to Albon's car at Monza, each one past his allocation and each carrying a ten-place drop. The 20-place penalty sends him to the back of the grid alongside Antonelli.",
    affectsSessions: ['race'],
    driverCodes: ['ALB'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/albon-joins-antonelli-with-heavy-grid-drop-for-italian-grand-prix.1qBmyUa5kxPfClqd8ibZ5Q',
    sourcePublishedAt: 1788538440000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'gasly-maiden-pole-monza',
    headline: 'Gasly takes his first F1 pole at Monza',
    body: "Pierre Gasly put the Alpine on pole at Monza with a 1:21.786, 0.060s clear of George Russell. It is his first pole in Formula 1 and Alpine's first, and the first for a French driver since Jean Alesi at Monza in 1997.",
    affectsSessions: ['race'],
    driverCodes: ['GAS'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/gasly-charges-to-sensational-maiden-f1-pole-at-monza-over-russell-and-piastri.4CKkkbvgmqL04ijMNBfuXF',
    sourcePublishedAt: 1788621420000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'haas-aduo-bearman',
    headline: "Only Bearman gets Haas's new Ferrari engine at Monza",
    body: "Ferrari has to supply its customers one upgraded power unit when the works cars step up, and Haas has given that single ADUO unit to Bearman, who leads Ocon in the standings. Ocon runs the older spec at a circuit team boss Komatsu calls very power sensitive. Both cars carry the new aero package, Haas's first big upgrade since May.",
    affectsSessions: ['quali', 'race'],
    driverCodes: ['BEA', 'OCO'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/why-both-haas-drivers-are-getting-monza-aero-upgrades-but-only-bearman-has-a-new-pu.6eilNMbkgEegAsA1fsy6iu',
    sourcePublishedAt: 1788514380000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'norris-monza-friday-pace',
    headline: 'Norris says McLaren are not in the pole fight at Monza',
    body: 'Norris ended Friday practice fourth, 0.384s off the fastest time, with Russell, Antonelli and Leclerc ahead of him. He says McLaren are not in the fight for pole at all and that the car is off in the corners they expected to be good at. Monza is the low-downforce opposite of the Hungaroring and Zandvoort, where McLaren has been strong.',
    affectsSessions: ['quali'],
    driverCodes: ['NOR'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/norris-claims-mclaren-not-in-the-fight-for-pole-at-all-after-monza-practice-struggles.43QIU1uA9ebkG5fJUoMXCN',
    sourcePublishedAt: 1788542040000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'monaco-appeal-hadjar-podium',
    headline: 'Hadjar has the Monaco podium back',
    body: "The FIA International Court of Appeal reinstated Gasly's two five-second Monaco penalties, dropping him from third to seventh. Hadjar takes third, and Piastri, Lawson and Lindblad each move up one place. Monaco race scores have been updated.",
    affectsSessions: ['race'],
    driverCodes: ['HAD', 'GAS'],
    sourceName: 'RaceFans',
    sourceUrl:
      'https://www.racefans.net/2026/09/04/hadjar-regains-monaco-gp-podium-as-fia-court-of-appeal-reinstates-gaslys-penalties/',
    sourcePublishedAt: 1788523200000,
  },
  {
    raceSlug: 'italy-2026',
    key: 'monza-starting-grid',
    headline: 'The Monza grid is set',
    body: "Gasly starts his maiden pole alongside Russell, with Leclerc, Hamilton and Verstappen each moving up a place after Piastri's three-place penalty for impeding Lawson. Antonelli and Albon start from the last two rows after exceeding their power unit allocations, and Alonso and Lawson both start from the pit lane.",
    affectsSessions: ['race'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/official-grid-who-starts-where-for-the-italian-grand-prix-2026.18oNflCZ6vMKCASJEMERzi',
    sourcePublishedAt: 1788696360000,
    startingGrid: [
      { position: 1, code: 'GAS' },
      { position: 2, code: 'RUS' },
      { position: 3, code: 'LEC' },
      { position: 4, code: 'HAM' },
      {
        position: 5,
        code: 'VER',
        note: 'Rear axle problem',
        newsKey: 'verstappen-rear-axle-monza',
      },
      {
        position: 6,
        code: 'PIA',
        note: '3-place penalty',
        newsKey: 'piastri-monza-grid-penalty',
      },
      { position: 7, code: 'COL' },
      { position: 8, code: 'NOR' },
      { position: 9, code: 'LIN' },
      { position: 10, code: 'BOR' },
      { position: 11, code: 'BEA' },
      { position: 12, code: 'HUL' },
      { position: 13, code: 'SAI' },
      { position: 14, code: 'OCO' },
      { position: 15, code: 'TSU' },
      { position: 16, code: 'BOT' },
      { position: 17, code: 'PER' },
      { position: 18, code: 'STR' },
      {
        position: 19,
        code: 'ANT',
        note: 'Engine penalty',
        newsKey: 'antonelli-grid-penalty',
      },
      {
        position: 20,
        code: 'ALB',
        note: 'Engine penalty',
        newsKey: 'albon-grid-penalty',
      },
      {
        position: 21,
        code: 'ALO',
        note: 'Pit lane',
        newsKey: 'alonso-pit-lane-start',
      },
      {
        position: 22,
        code: 'LAW',
        note: 'Pit lane',
        newsKey: 'lawson-grid-penalty',
      },
    ],
  },
];

/**
 * The Madrid weekend as published on prod, including the starting grid and
 * the three rows that link to other cards.
 */
export const MADRID_2026_NEWS: SeedRaceNewsItem[] = [
  {
    raceSlug: 'madrid-2026',
    key: 'sainz-madrid-grid-penalty',
    headline: 'Sainz takes a 3-place grid penalty at his home race',
    body: "The stewards found Sainz impeded Bottas at Turn 7 during Q1, ruling that Williams failed to warn him of the incoming car on a flying lap. He qualified 17th but starts Sunday's race from 20th.",
    affectsSessions: ['race'],
    driverCodes: ['SAI'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/sainz-handed-grid-penalty-for-spanish-gp-after-qualifying-infringement.4yL2CwTMI2kOZGXlPZsTtr',
    sourcePublishedAt: 1789203600000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'stroll-madrid-grid-penalty',
    headline: 'Stroll takes a 40-place grid penalty in Madrid',
    body: 'Aston Martin fitted new power unit parts that exceed Stroll’s allocation: a 40-place drop, which puts him at the back of the grid. He also set no time in qualifying after a water pressure issue.',
    affectsSessions: ['race'],
    driverCodes: ['STR'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/stroll-set-for-grid-penalty-at-spanish-grand-prix.2OrPCm6GyFhTJRocmnNzWP',
    sourcePublishedAt: 1789213380000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'bearman-madrid-fp3-crash',
    headline: 'Bearman misses qualifying after his FP3 crash',
    body: 'Bearman hit the wall at Turn 11 in the closing minute of FP3 and Haas could not repair the car in time. The team confirmed he would not participate in qualifying as a result of the damage to his VF-26. He starts Sunday’s race from the rear of the field.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['BEA'],
    sourceName: 'RacingNews365',
    sourceUrl:
      'https://racingnews365.com/oliver-bearman-ruled-out-of-f1-qualifying-after-heavy-fp3-shunt',
    sourcePublishedAt: 1789221540000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'mercedes-madrid-quali-warnings',
    headline: 'Both Mercedes drivers warned after qualifying, grid unchanged',
    body: 'Russell and Antonelli were summoned to the stewards after qualifying for failing to follow the race director’s instructions. Russell rejoined from the Turn 5 run-off on the wrong side of the bollard while avoiding a car behind, and Antonelli did not meet the delta time on his return to the pits after his final Q3 lap. Both were given warnings, so neither starting position changes.',
    affectsSessions: ['race'],
    driverCodes: ['RUS', 'ANT'],
    sourceName: 'PlanetF1',
    sourceUrl:
      'https://www.planetf1.com/news/fia-george-russell-spanish-grand-prix-2026-qualifying',
    sourcePublishedAt: 1789227000000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'madrid-qualifying-norris-pole',
    headline: 'Norris takes the first Madring pole by 0.011s',
    body: 'Norris set a 1:31.824 on his final run to beat Antonelli by 0.011 seconds. Verstappen qualified third for a much improved Red Bull, with Hamilton fourth and Leclerc fifth for Ferrari. Russell was sixth and Piastri seventh. After two crash-hit practice sessions, qualifying ran without a red flag.',
    affectsSessions: ['race'],
    driverCodes: ['NOR', 'ANT', 'VER', 'HAM', 'LEC', 'RUS'],
    sourceName: 'Autosport',
    sourceUrl:
      'https://www.autosport.com/f1/news/f1-spanish-gp-norris-on-pole/10855001/',
    sourcePublishedAt: 1789227000000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'red-bull-madrid-setup-changes',
    headline: 'Red Bull rebuilds Verstappen’s setup between sessions',
    body: 'Technical director Pierre Wache says Red Bull made significant changes to Verstappen’s car between FP1 and FP2 and planned more before FP3. He named mechanical grip, ride over the bumps, energy deployment and tyre graining as the areas the team is still working on, and said there is a lot of work to do before qualifying. Verstappen was sixth in FP2 and fifth in FP3.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['VER'],
    sourceName: 'RacingNews365',
    sourceUrl:
      'https://racingnews365.com/max-verstappens-car-overhauled-by-red-bull',
    sourcePublishedAt: 1789201800000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'albon-madrid-fp3-damage',
    headline: 'Albon sets no time in FP3 after hitting the wall',
    body: 'Albon clipped the inside wall early in FP3, returned to the Williams garage and got out of the car. The touch was light but the damage ended his session, so he was the only driver without a lap time in final practice.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['ALB'],
    sourceName: 'PlanetF1',
    sourceUrl:
      'https://www.planetf1.com/news/spanish-grand-prix-2026-fp3-report',
    sourcePublishedAt: 1789214400000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'hamilton-madrid-fp3-crash',
    headline:
      'Hamilton crashes in FP3 and keeps driving until the FIA orders him to stop',
    body: 'Hamilton locked up at the final corner in FP3 and hit the wall, bringing out the first red flag. He reversed out and drove on with the front wing under the car and the front-right tyre smoking. Race engineer Carlo Santi told him four times to stop, and Hamilton only parked the Ferrari once he was told it was a formal request from the FIA race director. Driving a car in an unsafe condition carries a risk of a penalty.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['HAM'],
    sourceName: 'PlanetF1',
    sourceUrl:
      'https://www.planetf1.com/news/spanish-grand-prix-2026-fp3-report',
    sourcePublishedAt: 1789214400000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'madrid-fp3-antonelli',
    headline: 'Antonelli leads a red-flagged final practice',
    body: 'Antonelli set a 1:32.797 to lead FP3 from Leclerc by 0.166 seconds, with Piastri third, Norris fourth and Verstappen fifth. Russell was sixth, seven tenths off his team mate. Two crashes stopped the session and race control paused the clock with 15 minutes and 38 seconds left, so the field ran in two short bursts rather than a clean hour.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['ANT', 'LEC', 'PIA', 'NOR', 'VER', 'RUS'],
    sourceName: 'Motorsport.com',
    sourceUrl:
      'https://www.motorsport.com/f1/news/f1-spanish-gp-fp3-report/10854919/',
    sourcePublishedAt: 1789214400000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'madrid-fp2-disruptions',
    headline: 'Norris loses FP2 running as Lindblad crashes',
    body: 'Lindblad crashed at Turn 13 and brought out Friday’s only Formula 1 red flag. He was unhurt. Norris completed two laps before McLaren found a gearbox problem that required a change, so he set no time. Alonso joined late while Aston Martin repaired a clutch problem carried over from FP1.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['NOR', 'LIN', 'ALO'],
    sourceName: 'Pit Debrief',
    sourceUrl: 'https://www.pitdebrief.com/post/f1-2026-spanish-gp-fp2-report/',
    sourcePublishedAt: 1789084800000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'russell-leads-madrid-fp1',
    headline: 'Russell leads the Madring’s first F1 practice',
    body: 'Russell led FP1 in 1:34.077, with Antonelli 0.286 seconds behind and Leclerc third. Hamilton and Verstappen completed the top five. Heavy traffic disrupted several laps, while Tsunoda stopped early with a power-steering problem.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['RUS', 'ANT', 'LEC', 'HAM', 'VER', 'TSU'],
    sourceName: 'Motorsport.com',
    sourceUrl:
      'https://www.motorsport.com/f1/news/f1-spanish-gp-fp1-report/10854498/',
    sourcePublishedAt: 1789084800000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'leclerc-madrid-aduo1',
    headline: 'Leclerc to start Madrid weekend with older engine specification',
    body: 'Sky Sport reports that Ferrari will start Leclerc’s Madrid weekend with the older ADUO-1 engine as a precaution. His Monza ADUO-2 unit escaped major damage in the crash, but Ferrari has chosen not to use it at the start of the weekend.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['LEC'],
    sourceName: 'Sky Sport',
    sourceUrl:
      'https://sport.sky.it/formula-1/2026/09/10/f1-ferrari-leclerc-motore-gp-soagna-news',
    sourcePublishedAt: 1789058580000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'mclaren-madrid-aero-updates',
    headline: 'McLaren brings small aero updates to Madrid',
    body: 'McLaren brings minor aerodynamic updates to Madrid, while the H-Wing introduced at Monza stays off the car. Technical director Mark Temple says tyre behaviour on the new asphalt is the biggest unknown, making Friday’s running crucial to the team’s preparations.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['NOR', 'PIA'],
    sourceName: 'McLaren',
    sourceUrl:
      'https://www.mclaren.com/racing/formula-1/2026/spanish-grand-prix/preview/',
    sourcePublishedAt: 1788973200000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'madrid-pirelli-tyre-preview',
    headline: 'Pirelli expects Madrid to be hard on tyres',
    body: 'Pirelli expects Madrid to be one of the most demanding circuits for the tyres. The smooth asphalt also offers little grip. Teams may save Hard tyres for Sunday if the softer compounds lose performance quickly in practice.',
    affectsSessions: ['quali', 'race'],
    sourceName: 'Pirelli',
    sourceUrl:
      'https://press.pirelli.com/the-madring-makes-its-world-championship-debut-with-the-challenge-of-the-monumental/',
    sourcePublishedAt: 1788825600000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'leclerc-madrid-power-unit',
    headline: 'Leclerc avoids an engine grid penalty in Madrid',
    body: 'Ferrari will replace the transmission casing damaged in Leclerc’s Monza crash. His power unit survived the impact, so he takes no engine-related grid penalty in Madrid.',
    affectsSessions: ['race'],
    driverCodes: ['LEC'],
    sourceName: 'Motorsport.com',
    sourceUrl:
      'https://es.motorsport.com/f1/news/leclerc-libra-penalizacion-problema-ferrari-madrid-otro/10853858/',
    sourcePublishedAt: 1788912000000,
  },
  {
    raceSlug: 'madrid-2026',
    key: 'leclerc-madrid-fitness',
    headline: 'Leclerc is cleared to race in Madrid',
    body: 'Leclerc has passed the additional medical checks that followed his Monza crash. He is in the car for the full weekend alongside Hamilton.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['LEC'],
    sourceName: 'GPblog',
    sourceUrl:
      'https://www.gpblog.com/nl/breaking-news/leclerc-groen-licht-gp-madrid-na-medische-checks',
    sourcePublishedAt: 1788799620000,
    writeUpImage: {
      src: '/media/yu-chu-chin-leclerc-ferrari-melbourne-2026-900.webp',
      srcSet:
        '/media/yu-chu-chin-leclerc-ferrari-melbourne-2026-450.webp 450w, /media/yu-chu-chin-leclerc-ferrari-melbourne-2026-900.webp 900w',
      sizes: '(min-width: 640px) 28rem, 100vw',
      alt: 'Charles Leclerc in Ferrari team kit at the 2026 Australian Grand Prix',
      width: 900,
      height: 600,
      context: 'Melbourne, 2026',
      creditName: 'Yu Chu Chin',
      creditUrl:
        'https://commons.wikimedia.org/wiki/File:Charles_Leclerc_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8643).jpg',
      licenseName: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      modificationNote: 'resized',
    },
  },
  {
    raceSlug: 'madrid-2026',
    key: 'hadjar-madrid-return',
    headline: 'Hadjar misses Madrid, Lawson stays in the Red Bull',
    body: 'Red Bull has confirmed Hadjar will not race at the Madring, a third weekend out with the wrist he broke during the summer break. Lawson keeps the second Red Bull alongside Verstappen and Tsunoda stays at Racing Bulls with Lindblad. Hadjar is in Madrid with the team but not in the car.',
    affectsSessions: ['quali', 'race'],
    driverCodes: ['HAD', 'LAW'],
    sourceName: 'Formula 1',
    sourceUrl:
      'https://www.formula1.com/en/latest/article/lawson-to-stay-at-red-bull-for-third-race-weekend-in-madrid-as-hadjars-recovery-continues.Bxrk9FOVDChcWCo5vxY8v',
    sourcePublishedAt: 1788803820000,
    writeUpImage: {
      src: '/media/yu-chu-chin-hadjar-red-bull-melbourne-2026-900.webp',
      srcSet:
        '/media/yu-chu-chin-hadjar-red-bull-melbourne-2026-450.webp 450w, /media/yu-chu-chin-hadjar-red-bull-melbourne-2026-900.webp 900w',
      sizes: '(min-width: 640px) 28rem, 100vw',
      alt: 'Isack Hadjar in Red Bull team kit at the 2026 Australian Grand Prix',
      width: 900,
      height: 600,
      context: 'Melbourne, 2026',
      creditName: 'Yu Chu Chin',
      creditUrl:
        'https://commons.wikimedia.org/wiki/File:Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8755).jpg',
      licenseName: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      modificationNote: 'cropped and resized',
    },
  },
  {
    raceSlug: 'madrid-2026',
    key: 'madrid-starting-grid',
    headline: 'The Madrid grid is set',
    body: 'Norris starts on pole from Antonelli and Verstappen, with Hamilton and Leclerc completing the top five. Sainz and Stroll both drop down the order on penalties, and Bearman lines up near the back after missing qualifying in his FP3 crash.',
    affectsSessions: ['race'],
    sourceName: 'The Race',
    sourceUrl:
      'https://www.the-race.com/formula-1/f1-2026-spanish-gp-starting-grid-after-two-penalties/',
    sourcePublishedAt: 1789203600000,
    startingGrid: [
      { position: 1, code: 'NOR' },
      { position: 2, code: 'ANT' },
      { position: 3, code: 'VER' },
      { position: 4, code: 'HAM' },
      { position: 5, code: 'LEC' },
      { position: 6, code: 'RUS' },
      { position: 7, code: 'PIA' },
      { position: 8, code: 'LAW' },
      { position: 9, code: 'COL' },
      { position: 10, code: 'LIN' },
      { position: 11, code: 'HUL' },
      { position: 12, code: 'BOR' },
      { position: 13, code: 'OCO' },
      { position: 14, code: 'GAS' },
      { position: 15, code: 'TSU' },
      { position: 16, code: 'ALB' },
      { position: 17, code: 'ALO' },
      { position: 18, code: 'PER' },
      { position: 19, code: 'BOT' },
      {
        position: 20,
        code: 'SAI',
        note: '3-place penalty',
        newsKey: 'sainz-madrid-grid-penalty',
      },
      {
        position: 21,
        code: 'BEA',
        note: 'Missed qualifying (crash)',
        newsKey: 'bearman-madrid-fp3-crash',
      },
      {
        position: 22,
        code: 'STR',
        note: '40-place penalty',
        newsKey: 'stroll-madrid-grid-penalty',
      },
    ],
  },
];
