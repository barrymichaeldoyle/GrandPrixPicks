import { scoreTopFive } from '@grandprixpicks/shared/scoring';

import { DriverBadge } from '@/components/DriverBadge';
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

/** How the crowd's own top five would have scored, on the same 5/3/1/0. */
function crowdScore({ consensus, classification }: ConsensusSession) {
  if (!classification?.length) {
    return null;
  }
  return scoreTopFive({
    picks: consensus.drivers.slice(0, 5).map((driver) => driver.driverId),
    classification: classification.map((entry) => entry.driverId),
  }).total;
}

function ConsensusTable({
  session,
  consensus,
  classification,
}: ConsensusSession) {
  const score = crowdScore({ session, consensus, classification });
  const rows = buildRows({ consensus, classification });
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
          {consensus.entrants} entries
          {score !== null && `, worth ${score} of 25`}
        </p>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse">
          <caption className="sr-only">
            {SESSION_LABELS[session]} pick rates, in the order players
            collectively placed the drivers
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="w-14 px-3 py-1.5 text-left text-xs font-semibold tracking-label text-text-muted uppercase"
              >
                Pos
              </th>
              <th
                scope="col"
                className="px-3 py-1.5 text-left text-xs font-semibold tracking-label text-text-muted uppercase"
              >
                Driver
              </th>
              <th
                scope="col"
                className="w-32 px-3 py-1.5 text-right text-xs font-semibold tracking-label text-text-muted uppercase"
              >
                Picked by
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((driver) => (
              <tr
                key={driver.driverId}
                className="border-b border-border last:border-0"
              >
                <th
                  scope="row"
                  className="gpp-mono w-14 px-3 py-1.5 text-left text-xs font-semibold text-text-muted"
                >
                  {driver.position === null ? '—' : `P${driver.position}`}
                </th>
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
                <td className="w-32 px-3 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    {/* The bar is the comparison; the number is the fact. The
                        fill is the team's colour so the accent is left to mean
                        one thing here: who actually took the session. A driver
                        nobody picked leaves the track empty. */}
                    <span aria-hidden className="h-1 w-12 shrink-0 bg-border">
                      <span
                        className="block h-1"
                        style={{
                          width: `${driver.pickRate}%`,
                          backgroundColor: teamColor(driver.team),
                        }}
                      />
                    </span>
                    <span className="gpp-mono text-xs font-semibold text-text">
                      {driver.pickRate}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
 * The explanation is written once above all four tables rather than repeated
 * per session. A sprint weekend has four of these, and four copies of the same
 * paragraph is the duplication this page is being cleaned up for.
 */
export function SessionConsensusSections({
  sessions,
}: {
  sessions: ConsensusSession[];
}) {
  if (sessions.length === 0) {
    return null;
  }
  const anyScored = sessions.some((entry) => crowdScore(entry) !== null);

  return (
    <div className="mt-10 max-w-3xl border-t border-border pt-6">
      <h2 className="font-title text-xl font-semibold text-text">
        How players picked this weekend
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Everyone&rsquo;s picks, as they stood at each deadline. The order
        weights a driver by the positions they were picked in, so a driver
        everyone put second ranks above one everyone put fifth.
        {anyScored &&
          ' Where a session has been classified, the score is what this five would have earned, and the driver who took P1 is marked.'}
      </p>
      {sessions.map((entry) => (
        <ConsensusTable key={entry.session} {...entry} />
      ))}
    </div>
  );
}
