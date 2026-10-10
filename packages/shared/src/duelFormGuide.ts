import { DRIVER_STATUS_LABELS, type DriverStatus } from './driverStatus';
import { SESSION_LABELS, type SessionType } from './sessions';

/**
 * One line of the form guide under a team-mate duel: a label and a value per
 * driver, in the duel's own order (driver1 then driver2). `edge` says which
 * side the numbers favour, so the guide can weight that side and leave the
 * other quiet. Null when they are level or one side has nothing.
 */
export type DuelFormGuideRow = {
  key: string;
  label: string;
  values: [string, string];
  edge: 'driver1' | 'driver2' | null;
};

type TallyDriver = {
  driverId: string;
  qualifying: number;
  race: number;
  sprintQualifying: number;
  sprint: number;
  total: number;
};

/** The shape `h2h.getTeammateBattles` returns for one pairing. */
export type DuelFormGuideBattle = {
  matchupId: string;
  drivers: readonly TallyDriver[];
};

/** The shape `practiceResults.getPracticeResultsForRace` returns per session. */
export type DuelFormGuidePractice = {
  sessionType: 'fp1' | 'fp2' | 'fp3';
  entries: readonly { code: string; position: number }[];
};

const SESSION_TALLY: Record<
  SessionType,
  { key: keyof Omit<TallyDriver, 'driverId' | 'total'>; label: string }
> = {
  quali: { key: 'qualifying', label: 'Qualifying this season' },
  sprint_quali: {
    key: 'sprintQualifying',
    label: 'Sprint qualifying this season',
  },
  sprint: { key: 'sprint', label: 'Sprints this season' },
  race: { key: 'race', label: 'Races this season' },
};

/** The shape `results.getWeekendSessionPositions` returns per session. */
export type DuelFormGuideSession = {
  sessionType: SessionType;
  entries: readonly {
    driverId: string;
    position: number;
    status: DriverStatus | null;
  }[];
};

const PRACTICE_LABEL = { fp1: 'FP1', fp2: 'FP2', fp3: 'FP3' } as const;

function edgeFor(
  driver1: number | null,
  driver2: number | null,
  higherIsBetter: boolean,
): DuelFormGuideRow['edge'] {
  if (driver1 === null || driver2 === null || driver1 === driver2) {
    return null;
  }
  const driver1Better = higherIsBetter ? driver1 > driver2 : driver1 < driver2;
  return driver1Better ? 'driver1' : 'driver2';
}

/**
 * The facts worth a glance before calling a duel: how the pair have split
 * this kind of session so far this year, and where each of them finished in
 * every session of this weekend that has a result, practice first and then
 * the scored sessions, in the order they ran.
 *
 * Nothing here says who to pick. A 9–4 qualifying record is a fact a fan
 * weighs for themselves; the guide reports it and stops. Rows with nothing in
 * them (a pairing with no settled sessions yet, a weekend before practice) are
 * left out rather than shown as dashes, so a Friday-morning duel carries no
 * empty table.
 */
export function duelFormGuideRows({
  driver1,
  driver2,
  sessionType,
  battle,
  practice,
  sessions,
}: {
  driver1: { _id: string; code: string };
  driver2: { _id: string; code: string };
  /** Undefined when one set of calls covers every open session. */
  sessionType: SessionType | undefined;
  battle: DuelFormGuideBattle | undefined;
  practice: readonly DuelFormGuidePractice[] | undefined;
  /** This weekend's published sessions: Sprint Quali, Sprint, Qualifying. */
  sessions?: readonly DuelFormGuideSession[] | undefined;
}): DuelFormGuideRow[] {
  const rows: DuelFormGuideRow[] = [];

  const tally1 = battle?.drivers.find((d) => d.driverId === driver1._id);
  const tally2 = battle?.drivers.find((d) => d.driverId === driver2._id);
  if (tally1 && tally2) {
    const session = sessionType ? SESSION_TALLY[sessionType] : undefined;
    const sessionTotal = session
      ? tally1[session.key] + tally2[session.key]
      : 0;
    if (session && sessionTotal > 0) {
      rows.push({
        key: `season-${sessionType}`,
        label: session.label,
        values: [String(tally1[session.key]), String(tally2[session.key])],
        edge: edgeFor(tally1[session.key], tally2[session.key], true),
      });
    }
    // The whole season too, unless the session row already is the whole
    // season (the only sessions settled so far are this kind).
    const total = tally1.total + tally2.total;
    if (total > 0 && total !== sessionTotal) {
      rows.push({
        key: 'season-total',
        label: session
          ? 'All sessions this season'
          : 'Head-to-head this season',
        values: [String(tally1.total), String(tally2.total)],
        edge: edgeFor(tally1.total, tally2.total, true),
      });
    }
  }

  for (const session of practice ?? []) {
    const position1 =
      session.entries.find((entry) => entry.code === driver1.code)?.position ??
      null;
    const position2 =
      session.entries.find((entry) => entry.code === driver2.code)?.position ??
      null;
    if (position1 === null && position2 === null) {
      continue;
    }
    rows.push({
      key: session.sessionType,
      label: PRACTICE_LABEL[session.sessionType],
      // A dash for a driver who sat the session out (a reserve drove the car):
      // the other side's position is still the fact a fan came for.
      values: [
        position1 === null ? '–' : `P${position1}`,
        position2 === null ? '–' : `P${position2}`,
      ],
      edge: edgeFor(position1, position2, false),
    });
  }

  for (const session of sessions ?? []) {
    const entry1 = session.entries.find(
      (entry) => entry.driverId === driver1._id,
    );
    const entry2 = session.entries.find(
      (entry) => entry.driverId === driver2._id,
    );
    if (!entry1 && !entry2) {
      continue;
    }
    // A non-starter's tail position is not a result, so it neither shows nor
    // counts. A retirement keeps its place for the comparison (the classified
    // order is what settles the duel) but reads as DNF.
    const position1 =
      entry1 && entry1.status !== 'dns' ? entry1.position : null;
    const position2 =
      entry2 && entry2.status !== 'dns' ? entry2.position : null;
    rows.push({
      key: session.sessionType,
      label: SESSION_LABELS[session.sessionType],
      values: [weekendValue(entry1), weekendValue(entry2)],
      edge: edgeFor(position1, position2, false),
    });
  }

  return rows;
}

function weekendValue(
  entry: DuelFormGuideSession['entries'][number] | undefined,
): string {
  if (!entry) {
    return '–';
  }
  return entry.status
    ? DRIVER_STATUS_LABELS[entry.status]
    : `P${entry.position}`;
}
