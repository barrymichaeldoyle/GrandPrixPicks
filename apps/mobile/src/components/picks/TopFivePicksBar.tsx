import { getTeamColor } from '../../lib/teamColors';
import { Pressable, Text, View } from '../../tw';

type Driver = {
  _id: string;
  code: string;
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
        const cell = (
          <>
            <View
              className="absolute top-0 bottom-0 left-0 w-[3px]"
              style={{ backgroundColor: getTeamColor(driver.team) }}
            />
            <Text className="text-[10px] leading-none text-accent">
              {`P${index + 1}`}
            </Text>
            <Text
              className="text-foreground min-w-0 flex-1 text-xs leading-none"
              numberOfLines={1}
            >
              {driver.code}
            </Text>
          </>
        );
        const className =
          'relative h-9 min-w-0 flex-1 flex-row items-center gap-1 overflow-hidden rounded-sm border border-border bg-surface-elevated pr-1 pl-2';

        if (!onEdit) {
          return (
            <View className={className} key={driver._id}>
              {cell}
            </View>
          );
        }

        return (
          <Pressable
            accessibilityLabel={`Edit your Top 5. P${index + 1}, ${driver.code}`}
            accessibilityRole="button"
            className={className}
            key={driver._id}
            onPress={onEdit}
          >
            {cell}
          </Pressable>
        );
      })}
    </View>
  );
}
