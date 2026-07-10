import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';

import { getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { Text, View } from '../../tw';

type ActualEntry = {
  position: number;
  code: string;
  displayName: string;
  team: string | null;
};

type PickEntry = {
  predictedPosition: number;
  actualPosition?: number;
  points: number;
  code: string;
  displayName: string;
};

type SessionResultsCardProps = {
  session: SessionType;
  actual: ActualEntry[];
  pickBreakdown?: PickEntry[];
  totalPoints?: number;
};

function pointColor(points: number): string {
  if (points >= 5) {
    return colors.success;
  }
  if (points >= 3) {
    return colors.accentHover;
  }
  if (points >= 1) {
    return colors.warning;
  }
  return colors.textMuted;
}

export function SessionResultsCard({
  session,
  actual,
  pickBreakdown,
  totalPoints,
}: SessionResultsCardProps) {
  const breakdownByPredicted = pickBreakdown
    ? [...pickBreakdown].sort(
        (a, b) => a.predictedPosition - b.predictedPosition,
      )
    : null;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-foreground text-sm font-bold">
          {SESSION_LABELS[session]}
        </Text>
        {totalPoints != null ? (
          <Text className="text-xs">
            <Text className="text-muted">You scored </Text>
            <Text className="font-extrabold text-accent-hover">
              {totalPoints} pts
            </Text>
          </Text>
        ) : breakdownByPredicted ? null : (
          <Text className="text-muted text-[11px] italic">
            No picks submitted
          </Text>
        )}
      </View>

      <View className="flex-row gap-3 pt-1">
        <Text className="text-muted flex-1 text-[10px] font-extrabold uppercase">
          Actual top 5
        </Text>
        {breakdownByPredicted ? (
          <Text className="text-muted flex-1 text-[10px] font-extrabold uppercase">
            Your picks
          </Text>
        ) : null}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          {actual.map((entry, i) => (
            <View key={`actual-${entry.position}`}>
              {i > 0 ? <View className="ml-1.5 h-px bg-border" /> : null}
              <DriverRow
                code={entry.code}
                name={entry.displayName}
                position={entry.position}
                team={entry.team}
              />
            </View>
          ))}
        </View>
        {breakdownByPredicted ? (
          <View className="flex-1">
            {breakdownByPredicted.map((pick, i) => (
              <View key={`pick-${pick.predictedPosition}`}>
                {i > 0 ? <View className="ml-1.5 h-px bg-border" /> : null}
                <PickRow pick={pick} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DriverRow({
  position,
  code,
  name,
  team,
}: {
  position: number;
  code: string;
  name: string;
  team: string | null;
}) {
  return (
    <View className="flex-row items-center gap-2 py-2">
      <View
        className="w-[3px] self-stretch rounded-sm"
        style={{ backgroundColor: getTeamColor(team) }}
      />
      <Text className="text-muted w-[22px] text-[11px] font-extrabold">
        P{position}
      </Text>
      <View className="flex-1 gap-px">
        <Text className="text-foreground text-xs font-extrabold">{code}</Text>
        <Text className="text-muted text-[10px]" numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

function PickRow({ pick }: { pick: PickEntry }) {
  const fg = pointColor(pick.points);
  return (
    <View className="flex-row items-center gap-2 py-2">
      <Text className="text-muted w-[22px] text-[11px] font-extrabold">
        P{pick.predictedPosition}
      </Text>
      <View className="flex-1 gap-px">
        <Text className="text-foreground text-xs font-extrabold">
          {pick.code}
        </Text>
        <Text className="text-muted text-[10px]" numberOfLines={1}>
          {pick.displayName}
        </Text>
      </View>
      <View
        className="rounded-full border px-1.5 py-px"
        style={{ borderColor: fg }}
      >
        <Text className="text-[11px] font-extrabold" style={{ color: fg }}>
          +{pick.points}
        </Text>
      </View>
    </View>
  );
}
