import {
  qualifyingSegmentLabel,
  splitLiveOrder,
} from '@grandprixpicks/shared/liveSessionBoard';
import { PRACTICE_SESSION_LABELS } from '@grandprixpicks/shared/practice';
import type { TextStyle } from 'react-native';

import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';
import { CompactPracticeRow } from '../races/CompactPracticeRow';
import { Card } from '../ui/Card';
import { DriverBadge } from '../ui/DriverBadge';

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

/**
 * Qualifying shows every car still running: who is in the drop zone matters
 * as much as who is on top, and six rows hid it.
 */
function liveRows(sessionType: string) {
  return sessionType === 'quali' || sessionType === 'sprint_quali'
    ? Infinity
    : LIVE_ROWS;
}

type LiveEntry = {
  driverNumber: number;
  position: number;
  code: string;
  displayName: string;
  team?: string | null;
  bestLapSeconds: number | null;
  knockedOutIn?: 1 | 2;
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
 * Who a finished qualifying segment knocked out, as web shows it: a wrapped
 * line of position and badge. Their laps belong to a segment that is over,
 * so they carry no gap to the current leader.
 */
function KnockoutRow({
  label,
  entries,
}: {
  label: string;
  entries: LiveEntry[];
}) {
  const { numeralFontFamily } = useTypography();
  const mono: TextStyle = {
    fontVariant: ['tabular-nums'],
    ...(numeralFontFamily ? { fontFamily: numeralFontFamily } : null),
  };
  return (
    <View className="gap-1.5 border-t border-border pt-2.5">
      <Text className="text-muted text-xs font-medium">{label}</Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-1.5">
        {entries.map((entry) => (
          <View
            key={entry.driverNumber}
            className="flex-row items-center gap-1.5"
          >
            <Text className="text-muted text-xs font-semibold" style={mono}>
              P{entry.position}
            </Text>
            <DriverBadge
              code={entry.code}
              displayName={entry.displayName}
              fill="sunken"
              number={entry.driverNumber}
              size="sm"
              team={entry.team}
            />
          </View>
        ))}
      </View>
    </View>
  );
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
  const { top, knockouts } = splitLiveOrder(
    live.entries as LiveEntry[],
    liveRows(live.sessionType),
  );
  const entries = withGaps(top);
  const label = SESSION_LABELS[live.sessionType] ?? live.sessionType;
  const segment =
    'phase' in live && live.phase !== undefined
      ? qualifyingSegmentLabel(live.sessionType, live.phase)
      : null;

  return (
    <View className="mx-4 mt-3">
      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-accent">
            {label}
            {segment ? (
              <Text className="text-muted">{` ${segment}`}</Text>
            ) : null}
          </Text>
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
        {knockouts.map((group) => (
          <KnockoutRow
            key={group.segment}
            label={`Out in ${qualifyingSegmentLabel(live.sessionType, group.segment)}`}
            entries={group.entries}
          />
        ))}
        <Text className="text-muted text-xs">
          Live timing can change, including after the flag.
        </Text>
      </Card>
    </View>
  );
}
