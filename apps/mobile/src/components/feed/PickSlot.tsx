import { pickScoreBandClass } from '../../lib/pickScoreBand';
import { getTeamColor } from '../../lib/teamColors';
import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';

const TEAM_BAR_INSET = 4;

function TeamBar({ team }: { team?: string | null }) {
  return (
    <View
      className="absolute top-0 bottom-0 left-0 w-[3px]"
      style={{ backgroundColor: getTeamColor(team) }}
    />
  );
}

function DriverCode({ code, size }: { code: string; size: 'pick' | 'result' }) {
  const { numeralFontFamily } = useTypography();
  return (
    <Text
      className={`pl-1 leading-none uppercase ${
        size === 'result'
          ? 'text-foreground text-[13px] font-semibold'
          : 'text-foreground text-xs'
      }`}
      numberOfLines={1}
      style={numeralFontFamily ? { fontFamily: numeralFontFamily } : undefined}
    >
      {code}
    </Text>
  );
}

/** A player's pick in one of the five slots, banded with its score colour. */
export function PickSlot({
  code,
  team,
  displayName,
  points,
  predictedPosition,
}: {
  code: string;
  team?: string | null;
  displayName?: string | null;
  points?: number;
  predictedPosition: number;
}) {
  const label = displayName ?? code;
  const pointsLabel =
    points === undefined
      ? `P${predictedPosition}: ${label}`
      : `P${predictedPosition}: ${label} — ${points} ${points === 1 ? 'point' : 'points'}`;

  return (
    <View
      accessibilityLabel={pointsLabel}
      className="w-full min-w-0 flex-1 gap-[3px]"
    >
      <View className="relative h-7 w-full items-center justify-center overflow-hidden border border-border bg-surface-elevated">
        <TeamBar team={team} />
        <DriverCode code={code} size="pick" />
      </View>
      <View
        accessibilityElementsHidden
        className={`h-1 ${pickScoreBandClass(points)}`}
        importantForAccessibility="no"
        style={{ marginLeft: TEAM_BAR_INSET }}
      />
    </View>
  );
}

/**
 * The published finishing position, above the players' picks.
 *
 * Unbanded: a bar under this row would read as a score.
 */
export function ResultSlot({
  code,
  team,
  displayName,
  position,
}: {
  code: string;
  team?: string | null;
  displayName?: string | null;
  position: number;
}) {
  return (
    <View
      accessibilityLabel={`P${position}: ${displayName ?? code}`}
      className="relative h-8 w-full min-w-0 flex-1 items-center justify-center overflow-hidden bg-surface-sunken"
    >
      <TeamBar team={team} />
      <DriverCode code={code} size="result" />
    </View>
  );
}

/** Empty slot, so a partial set of picks still lines up with the result row. */
export function EmptySlot() {
  return (
    <View
      accessibilityElementsHidden
      className="w-full min-w-0 flex-1 gap-[3px]"
      importantForAccessibility="no"
    >
      <View className="h-7 w-full border border-dashed border-border/60" />
      <View
        className="h-1 bg-border/40"
        style={{ marginLeft: TEAM_BAR_INSET }}
      />
    </View>
  );
}
