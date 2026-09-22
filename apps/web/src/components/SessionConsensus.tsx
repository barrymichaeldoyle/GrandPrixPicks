import { useId, useState } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { TabSwitch } from '@/components/TabSwitch';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

export type SessionConsensusData = {
  entrants: number;
  lockAt: number;
  sampled: boolean;
  drivers: {
    driverId: string;
    code: string;
    displayName: string;
    team: string | null;
    number: number | null;
    nationality: string | null;
    slots: number[];
    picks: number;
    pickRate: number;
    consensusPosition: number;
  }[];
};

type ConsensusSession = {
  session: SessionType;
  consensus: SessionConsensusData;
  /**
   * Published finishing order, when there is one. Carries the driver's own
   * details because the winner is not always in the table below: a driver
   * nobody picked has no consensus row to borrow a name from.
   */
  classification?: {
    driverId: string;
    code: string;
    displayName: string;
    team: string | null;
    number?: number | null;
    nationality?: string | null;
  }[];
};

/** Rows shown per session. Beyond the top five the pick rate tails into noise. */
const ROWS = 8;

/** One rendered line. `position` is null for a driver nobody picked. */
type ConsensusRow = {
  driverId: string;
  code: string;
  displayName: string;
  team: string | null;
  number: number | null;
  nationality: string | null;
  position: number | null;
  pickRate: number;
  tookP1: boolean;
};

function teamColor(team: string | null) {
  return (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
}

/**
 * The rows to draw, with the driver who actually took P1 always among them.
 *
 * The table is ordered by what players did, so the winner can sit outside the
 * eight rows worth showing, or be missing entirely because not one entry
 * picked them. Both cases are the most interesting thing on the page rather
 * than an edge case to drop: at Monza the pole-sitter appeared in no entry at
 * all. When that happens the driver is appended with an empty bar, which is
 * the honest shape of nobody having picked them.
 */
function buildRows({
  consensus,
  classification,
}: Pick<ConsensusSession, 'consensus' | 'classification'>): ConsensusRow[] {
  const winner = classification?.[0];
  const rows: ConsensusRow[] = consensus.drivers
    .slice(0, ROWS)
    .map((driver) => ({
      driverId: driver.driverId,
      code: driver.code,
      displayName: driver.displayName,
      team: driver.team,
      number: driver.number,
      nationality: driver.nationality,
      position: driver.consensusPosition,
      pickRate: driver.pickRate,
      tookP1: driver.driverId === winner?.driverId,
    }));
  if (!winner || rows.some((row) => row.tookP1)) {
    return rows;
  }
  const picked = consensus.drivers.find(
    (driver) => driver.driverId === winner.driverId,
  );
  rows.push({
    driverId: winner.driverId,
    code: picked?.code ?? winner.code,
    displayName: picked?.displayName ?? winner.displayName,
    team: picked?.team ?? winner.team,
    number: picked?.number ?? winner.number ?? null,
    nationality: picked?.nationality ?? winner.nationality ?? null,
    position: picked?.consensusPosition ?? null,
    pickRate: picked?.pickRate ?? 0,
    tookP1: true,
  });
  return rows;
}

/** One line of the P1 view. `count` is how many entries put the driver in P1. */
type P1Row = {
  driverId: string;
  code: string;
  displayName: string;
  team: string | null;
  number: number | null;
  nationality: string | null;
  count: number;
  tookP1: boolean;
};

/**
 * Who players put in P1, most-picked first, as the brand's community-picks
 * cards draw it. The driver who took P1 is marked wherever they land, and is
 * appended with a count of zero when nobody picked them: at Monza the
 * pole-sitter was in no entry at all.
 */
function buildP1Rows({
  consensus,
  classification,
}: Pick<ConsensusSession, 'consensus' | 'classification'>): P1Row[] {
  const winner = classification?.[0];
  const rows: P1Row[] = consensus.drivers
    .filter((driver) => (driver.slots[0] ?? 0) > 0)
    .map((driver) => ({
      driverId: driver.driverId,
      code: driver.code,
      displayName: driver.displayName,
      team: driver.team,
      number: driver.number,
      nationality: driver.nationality,
      count: driver.slots[0] ?? 0,
      tookP1: driver.driverId === winner?.driverId,
    }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  if (!winner || rows.some((row) => row.tookP1)) {
    return rows;
  }
  const picked = consensus.drivers.find(
    (driver) => driver.driverId === winner.driverId,
  );
  rows.push({
    driverId: winner.driverId,
    code: picked?.code ?? winner.code,
    displayName: picked?.displayName ?? winner.displayName,
    team: picked?.team ?? winner.team,
    number: picked?.number ?? winner.number ?? null,
    nationality: picked?.nationality ?? winner.nationality ?? null,
    count: 0,
    tookP1: true,
  });
  return rows;
}

type ConsensusView = 'p1' | 'top5';

const VIEW_OPTIONS: { value: ConsensusView; label: string }[] = [
  { value: 'p1', label: 'P1 picks' },
  { value: 'top5', label: 'Top 5 picks' },
];

const headClass =
  'px-3 py-1.5 text-xs font-semibold tracking-label text-text-muted uppercase';

function DriverCell({
  driver,
  outcomeLabel,
}: {
  driver: Pick<
    P1Row,
    'code' | 'displayName' | 'team' | 'number' | 'nationality' | 'tookP1'
  >;
  outcomeLabel: string;
}) {
  return (
    <td className="min-w-0 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <DriverBadge
          code={driver.code}
          displayName={driver.displayName}
          team={driver.team ?? undefined}
          number={driver.number}
          nationality={driver.nationality}
          size="sm"
          prerenderTooltip={false}
        />
        <span className="min-w-0 truncate text-sm text-text">
          {driver.displayName}
        </span>
        {driver.tookP1 && (
          <span className="shrink-0 rounded-sm bg-accent px-1.5 py-0.5 text-xs font-semibold tracking-label text-text-on-accent uppercase">
            {outcomeLabel}
          </span>
        )}
      </div>
    </td>
  );
}

/**
 * The bar is the comparison; the number is the fact. The fill is the team's
 * colour so the accent is left to mean one thing here: who actually took the
 * session. An empty track is a driver nobody picked. The number is held to a
 * fixed width that fits the widest ("66.7%") so every bar starts at the same
 * x, whatever its label.
 */
function PickBar({
  fill,
  team,
  label,
}: {
  /** 0 to 100. */
  fill: number;
  team: string | null;
  label: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span aria-hidden className="h-1 w-12 shrink-0 bg-border">
        <span
          className="block h-1"
          style={{ width: `${fill}%`, backgroundColor: teamColor(team) }}
        />
      </span>
      <span className="gpp-mono w-10 shrink-0 text-right text-xs font-semibold text-text">
        {label}
      </span>
    </div>
  );
}

function ConsensusTable({
  session,
  consensus,
  classification,
  view,
}: ConsensusSession & { view: ConsensusView }) {
  // A qualifying session is taken from pole, and calling it "won" reads as the
  // race result on a page that carries both.
  const outcomeLabel =
    session === 'quali' || session === 'sprint_quali' ? 'Pole' : 'Won';
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-text">
          {SESSION_LABELS[session]}
        </h3>
        <p className="text-xs text-text-muted">
          {/* `sampled` means the query hit its read cap, so the count is a
              floor and the percentages describe that sample. Saying so beats
              presenting a partial count as a total. */}
          {consensus.sampled ? 'First ' : ''}
          {consensus.entrants} players
        </p>
      </div>
      <div className="mt-2 overflow-x-auto">
        {view === 'p1' ? (
          <P1Table
            session={session}
            consensus={consensus}
            classification={classification}
            outcomeLabel={outcomeLabel}
          />
        ) : (
          <TopFiveTable
            session={session}
            consensus={consensus}
            classification={classification}
            outcomeLabel={outcomeLabel}
          />
        )}
      </div>
    </section>
  );
}

function P1Table({
  session,
  consensus,
  classification,
  outcomeLabel,
}: ConsensusSession & { outcomeLabel: string }) {
  const rows = buildP1Rows({ consensus, classification });
  const most = Math.max(1, ...rows.map((row) => row.count));
  return (
    <table className="w-full min-w-[20rem] border-collapse">
      <caption className="sr-only">
        {SESSION_LABELS[session]}: how many players picked each driver for P1
      </caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={`${headClass} text-left`}>
            Driver
          </th>
          <th scope="col" className={`${headClass} w-32 text-right`}>
            P1 picks
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((driver) => (
          <tr key={driver.driverId}>
            <DriverCell driver={driver} outcomeLabel={outcomeLabel} />
            <td className="w-32 px-3 py-1.5">
              <PickBar
                fill={(driver.count / most) * 100}
                team={driver.team}
                label={String(driver.count)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopFiveTable({
  session,
  consensus,
  classification,
  outcomeLabel,
}: ConsensusSession & { outcomeLabel: string }) {
  const rows = buildRows({ consensus, classification });
  return (
    <table className="w-full min-w-[20rem] border-collapse">
      <caption className="sr-only">
        {SESSION_LABELS[session]} pick rates, in the order players collectively
        placed the drivers
      </caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={`${headClass} w-14 text-left`}>
            Pos
          </th>
          <th scope="col" className={`${headClass} text-left`}>
            Driver
          </th>
          <th scope="col" className={`${headClass} w-32 text-right`}>
            Picked by
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((driver) => (
          <tr key={driver.driverId}>
            <th
              scope="row"
              className="gpp-mono w-14 px-3 py-1.5 text-left text-xs font-semibold text-text-muted"
            >
              {driver.position === null ? '—' : `P${driver.position}`}
            </th>
            <DriverCell driver={driver} outcomeLabel={outcomeLabel} />
            <td className="w-32 px-3 py-1.5">
              <PickBar
                fill={driver.pickRate}
                team={driver.team}
                label={`${driver.pickRate}%`}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * What everyone picked, for each session that has locked.
 *
 * The one thing on this site that is not published anywhere else. Every other
 * page explains Formula 1 in competition with publications that have covered
 * it for decades; this reports a fact only we hold, it is different every
 * weekend, and it is the half of the game a player cannot see from their own
 * entry. It renders from loader data for the same reason the classification
 * does: a crawler never boots the Convex subscriptions.
 *
 * The backend returns nothing before a session locks, so this cannot become an
 * answer sheet. See `consensus.ts` for that rule.
 *
 * One switch sets the view for every session, rather than one per table: a
 * sprint weekend has four. Both views are server-rendered and the inactive one
 * is only hidden, so a crawler reads the full Top 5 data whichever is showing.
 */
export function SessionConsensusSections({
  sessions,
}: {
  sessions: ConsensusSession[];
}) {
  const [view, setView] = useState<ConsensusView>('p1');
  const baseId = useId().replaceAll(':', '');
  const tabsId = `consensus-view-${baseId}`;
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 max-w-3xl">
      <h2 className="font-title text-xl font-semibold text-text">
        How players picked this weekend
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Every player&rsquo;s picks, as they were when each session locked.
      </p>
      <TabSwitch
        value={view}
        onChange={setView}
        options={VIEW_OPTIONS}
        className="mt-4 flex gap-1"
        ariaLabel="Picks view"
        id={tabsId}
        panelId={`${tabsId}-panel`}
      />
      <div
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${view}`}
      >
        {VIEW_OPTIONS.map((option) => (
          <div key={option.value} hidden={view !== option.value}>
            {option.value === 'top5' && (
              <p className="mt-4 text-sm text-text-muted">
                Drivers are ranked by where players put them, so a P1 pick
                counts for more than a P5 pick. The percentage is the share of
                players who had the driver anywhere in their Top 5.
              </p>
            )}
            {sessions.map((entry) => (
              <ConsensusTable
                key={entry.session}
                {...entry}
                view={option.value}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
