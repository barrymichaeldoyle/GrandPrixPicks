import type { DriverIdentity } from '../ui/DriverCard';
import { hasDriverDetail } from '../ui/DriverCard';
import { pickScoreBandClass } from '../../lib/pickScoreBand';
import { getTeamColor } from '../../lib/teamColors';
import { useDriverCard } from '../../providers/DriverCardProvider';
import { useTypography } from '../../theme/typography';
import { Pressable, Text, View } from '../../tw';

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

/**
 * Opens the driver card when the chip has something to say beyond its code.
 *
 * A plain `View` when it does not: a cell that lifts a finger and shows nothing
 * teaches people the taps do not work, which costs more than the one chip.
 */
function DriverPress({
  driver,
  accessibilityLabel,
  className,
  children,
}: {
  driver: DriverIdentity;
  accessibilityLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  const { showDriver } = useDriverCard();

  if (!hasDriverDetail(driver)) {
    return (
      <View accessibilityLabel={accessibilityLabel} className={className}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint="Shows the driver's number, name and team"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className={className}
      onPress={() => showDriver(driver)}
    >
      {children}
    </Pressable>
  );
}

/** A player's pick in one of the five slots, banded with its score colour. */
export function PickSlot({
  code,
  team,
  displayName,
  number,
  nationality,
  points,
  predictedPosition,
}: {
  code: string;
  team?: string | null;
  displayName?: string | null;
  number?: number | null;
  nationality?: string | null;
  points?: number;
  predictedPosition: number;
}) {
  const label = displayName ?? code;
  const pointsLabel =
    points === undefined
      ? `P${predictedPosition}: ${label}`
      : `P${predictedPosition}: ${label} — ${points} ${points === 1 ? 'point' : 'points'}`;

  return (
    <DriverPress
      accessibilityLabel={pointsLabel}
      className="w-full min-w-0 flex-1 gap-[3px]"
      driver={{ code, team, displayName, number, nationality }}
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
    </DriverPress>
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
  number,
  nationality,
  position,
}: {
  code: string;
  team?: string | null;
  displayName?: string | null;
  number?: number | null;
  nationality?: string | null;
  position: number;
}) {
  return (
    <DriverPress
      accessibilityLabel={`P${position}: ${displayName ?? code}`}
      className="relative h-8 w-full min-w-0 flex-1 items-center justify-center overflow-hidden bg-surface-sunken"
      driver={{ code, team, displayName, number, nationality }}
    >
      <TeamBar team={team} />
      <DriverCode code={code} size="result" />
    </DriverPress>
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
