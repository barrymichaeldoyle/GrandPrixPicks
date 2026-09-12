import { PRACTICE_SESSION_LABELS } from '@grandprixpicks/shared/practice';

import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { Text, View } from '../../tw';
import { CompactPracticeRow } from '../races/CompactPracticeRow';
import { Card } from '../ui/Card';

/**
 * Session names, in full. The practice three come from the shared map so this
 * card and the practice cards cannot drift on what FP2 is called.
 */
const SESSION_LABELS: Record<string, string> = {
  ...PRACTICE_SESSION_LABELS,
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

/** The scoring-relevant top of a running order, as web shows it. */
const LIVE_ROWS = 6;

type LiveEntry = {
  driverNumber: number;
  position: number;
  code: string;
  displayName: string;
  team?: string | null;
  bestLapSeconds: number | null;
};

/**
 * The running order in the shape the timing sheet reads: P1 carries the lap,
 * everyone else carries the gap to it.
 *
 * Both apps printed raw seconds in every row — `92.079`, six times, with
 * nothing to compare against. `practiceGapOrLap` inside `CompactPracticeRow`
 * already owns that rule, so the rows only have to arrive in the shape it
 * expects. A driver with no lap yet keeps their place and shows an em dash.
 */
function withGaps(entries: LiveEntry[]) {
  const leader = entries.find((entry) => entry.bestLapSeconds != null);
  return entries.map((entry) => ({
    position: entry.position,
    code: entry.code,
    displayName: entry.displayName,
    team: entry.team ?? null,
    driverNumber: entry.driverNumber,
    bestLapSeconds: entry.bestLapSeconds ?? undefined,
    gapToLeaderSeconds:
      entry.bestLapSeconds == null || leader?.bestLapSeconds == null
        ? undefined
        : entry.bestLapSeconds - leader.bestLapSeconds,
  }));
}

/**
 * The session currently on track.
 *
 * Deliberately the practice card: same shell, same `CompactPracticeRow` with
 * its team bar and driver chip, same figures. A classification is a
 * classification whether it is final or still moving, and the old card said
 * otherwise — a plain list of names and unformatted seconds with no team
 * colour on it, sitting a few hundred pixels from a practice card built the
 * other way.
 *
 * What differs is the one thing that actually differs: this order is not
 * final. That is the accent dot on the header, and the line under the rows.
 *
 * It sits under the weekend hero rather than above it. Above, it was the first
 * thing on the Home tab, which put lap times from a session in progress ahead
 * of the picks the tab exists to take.
 */
export function LiveClassificationCard() {
  const live = useQuery(api.liveClassification.current, {});
  if (!live?.entries.length) {
    return null;
  }
  const entries = withGaps((live.entries as LiveEntry[]).slice(0, LIVE_ROWS));
  const label = SESSION_LABELS[live.sessionType] ?? live.sessionType;

  return (
    <View className="mx-4 mt-3">
      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-accent">{label}</Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-accent" />
            <Text className="text-xs font-medium text-accent">Live</Text>
          </View>
        </View>
        <View>
          {entries.map((entry, index) => (
            <View key={entry.driverNumber}>
              {/* Web separates these rows with `divide-y`; a hairline between
                  siblings is the same rule written out. */}
              {index > 0 ? <View className="h-px bg-border" /> : null}
              <CompactPracticeRow entry={entry} />
            </View>
          ))}
        </View>
        <Text className="text-muted text-xs">
          Live timing can change, including after the flag.
        </Text>
      </Card>
    </View>
  );
}
