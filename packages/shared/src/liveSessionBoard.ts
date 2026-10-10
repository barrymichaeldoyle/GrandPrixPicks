/**
 * One player's score against the running order, from
 * `liveScoring.getLiveSessionBoard`.
 *
 * Written out rather than inferred: that query returns `v.any()`, as the race
 * page's snapshot query does, so the shape has to be stated somewhere. Generic
 * over the id type so each app can carry its own `Id<'users'>`.
 */
export type LivePlayer<UserId extends string = string> = {
  userId: UserId;
  rank: number | null;
  top5Points: number;
  h2hPoints: number;
  total: number;
  picks: {
    code: string;
    displayName: string;
    team: string | null;
    predictedPosition: number;
    actualPosition?: number;
    points: number;
  }[];
};

export type LiveBoard<UserId extends string = string> = {
  sessionType: 'sprint' | 'race';
  updatedAt: number;
  totalPlayers: number;
  top5: { code: string; displayName: string; team: string | null }[];
  players: LivePlayer<UserId>[];
};

/**
 * Whether a session can be scored from a running order.
 *
 * Qualifying's classification is not its running order at any point before the
 * flag — a driver on a flying lap is provisionally last — so there is nothing
 * honest to show for it until the result publishes.
 */
export function liveSessionType(
  sessionType: string | undefined,
): 'race' | 'sprint' | null {
  return sessionType === 'race' || sessionType === 'sprint'
    ? sessionType
    : null;
}

/**
 * The group's rows in live order, or null to leave the group as it was.
 *
 * Null unless the board covers *every* player in the group. A board that has
 * scored some of them and not the rest would sort real totals against zeroes,
 * and a feed group is read as a ranking — the player at the bottom would look
 * beaten rather than missing. Partial is the normal state for a moment after a
 * page loads more events, so this is a wait, not an error.
 */
export function rankLiveGroup<
  UserId extends string,
  T extends { userId?: UserId | undefined },
>(
  events: T[],
  board: LiveBoard<UserId> | null | undefined,
): { events: T[]; playerFor: (event: T) => LivePlayer<UserId> } | null {
  if (!board || board.top5.length === 0 || events.length === 0) {
    return null;
  }
  const byUser = new Map(
    board.players.map((player) => [player.userId, player]),
  );
  if (!events.every((event) => event.userId && byUser.has(event.userId))) {
    return null;
  }
  function playerFor(event: T) {
    return byUser.get(event.userId!)!;
  }
  return {
    events: [...events].sort((a, b) => playerFor(b).total - playerFor(a).total),
    playerFor,
  };
}

/** "Q2", or "SQ2" in sprint qualifying. */
export function qualifyingSegmentLabel(
  sessionType: string,
  segment: number,
): string {
  return `${sessionType === 'sprint_quali' ? 'SQ' : 'Q'}${segment}`;
}

/**
 * A live qualifying order split the way the card shows it: the top of the
 * segment still running, then who each finished segment knocked out, latest
 * first. Practice and races have no knockouts, so they come back as `top`
 * alone.
 */
export function splitLiveOrder<T extends { knockedOutIn?: 1 | 2 }>(
  entries: T[],
  topRows: number,
): { top: T[]; knockouts: { segment: 1 | 2; entries: T[] }[] } {
  const running = entries.filter((entry) => entry.knockedOutIn === undefined);
  const knockouts = ([2, 1] as const)
    .map((segment) => ({
      segment,
      entries: entries.filter((entry) => entry.knockedOutIn === segment),
    }))
    .filter((group) => group.entries.length > 0);
  return { top: running.slice(0, topRows), knockouts };
}

/**
 * A race or sprint row's figure: the leader is "Leader", everyone else their
 * gap to the leader, or laps once lapped. An em dash until the intervals feed
 * has a gap for the car.
 */
export function liveRaceGap(entry: {
  position: number;
  gapToLeaderSeconds?: number | null;
  lapsBehind?: number | null;
}): string {
  if (entry.position === 1) {
    return 'Leader';
  }
  if (entry.lapsBehind != null) {
    return `+${entry.lapsBehind} ${entry.lapsBehind === 1 ? 'lap' : 'laps'}`;
  }
  return entry.gapToLeaderSeconds == null
    ? '—'
    : `+${entry.gapToLeaderSeconds.toFixed(3)}`;
}
