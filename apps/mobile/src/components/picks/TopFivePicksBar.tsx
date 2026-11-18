import { getTeamFill } from '../../lib/teamColors';
import { Pressable, Text, View } from '../../tw';

type Driver = {
  _id: string;
  code: string;
  /** What VoiceOver reads: a code like "NOR" is spoken as a word. */
  displayName?: string | null;
  team?: string | null;
};

export function TopFivePicksBar({
  picks,
  drivers,
  onEdit,
}: {
  picks: ReadonlyArray<string>;
  drivers: ReadonlyArray<Driver>;
  onEdit?: () => void;
}) {
  const byId = new Map(drivers.map((driver) => [driver._id, driver]));
  const picked = picks
    .map((id) => byId.get(id))
    .filter((driver): driver is Driver => driver != null);

  if (picked.length === 0) {
    return null;
  }

  return (
    <View className="mt-2 flex-row gap-1">
      {picked.map((driver, index) => {
        // Every cell is a pick, so every cell wears its team's colour, as the
        // pool card it came from does (web `MobilePickSummary`).
        const { fill, ink } = getTeamFill(driver.team);
        const cell = (
          <>
            <Text
              className="text-xs leading-none opacity-75"
              style={{ color: ink }}
            >
              {`P${index + 1}`}
            </Text>
            <Text
              className="min-w-0 flex-1 text-xs leading-none font-semibold"
              numberOfLines={1}
              style={{ color: ink }}
            >
              {driver.code}
            </Text>
          </>
        );
        const className =
          'relative h-9 min-w-0 flex-1 flex-row items-center gap-1 overflow-hidden rounded-sm border pr-1 pl-2';
        const fillStyle = { backgroundColor: fill, borderColor: fill };

        if (!onEdit) {
          return (
            <View className={className} key={driver._id} style={fillStyle}>
              {cell}
            </View>
          );
        }

        return (
          <Pressable
            accessibilityLabel={`Edit your Top 5. P${index + 1}, ${driver.displayName ?? driver.code}`}
            accessibilityRole="button"
            className={className}
            key={driver._id}
            onPress={onEdit}
            style={fillStyle}
          >
            {cell}
          </Pressable>
        );
      })}
    </View>
  );
}
