import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { Pressable, Text, View } from '../../tw';
import { Numeral } from '../ui/Numeral';

type H2HDriver = {
  _id: string;
  code: string;
};

type H2HMatchup = {
  _id: string;
  team: string;
  driver1: H2HDriver;
  driver2: H2HDriver;
};

type H2HMatchupGridProps = {
  matchups: H2HMatchup[];
  selections: Record<string, string>;
  mode: 'interactive' | 'readonly';
  onSelect?: (matchupId: string, driverId: string) => void;
};

export function H2HMatchupGrid({
  matchups,
  selections,
  mode,
  onSelect,
}: H2HMatchupGridProps) {
  if (matchups.length === 0) {
    return (
      <View className="py-2">
        <Text className="text-muted text-[13px]">
          No H2H matchups for this season.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {matchups.map((matchup) => {
        const selected = selections[matchup._id];

        return (
          <View
            className="overflow-hidden rounded-lg bg-surface"
            key={matchup._id}
          >
            <View className="flex-row items-center gap-1.5 px-3 pt-2">
              <View
                className="h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: getTeamColor(matchup.team) }}
              />
              <Text className="text-muted text-xs font-semibold uppercase">
                {displayTeamName(matchup.team)}
              </Text>
            </View>
            <View className="flex-row gap-1 p-1">
              <DriverButton
                driver={matchup.driver1}
                isSelected={selected === matchup.driver1._id}
                mode={mode}
                onPress={() => onSelect?.(matchup._id, matchup.driver1._id)}
              />
              <DriverButton
                driver={matchup.driver2}
                isSelected={selected === matchup.driver2._id}
                mode={mode}
                onPress={() => onSelect?.(matchup._id, matchup.driver2._id)}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DriverButton({
  driver,
  isSelected,
  mode,
  onPress,
}: {
  driver: H2HDriver;
  isSelected: boolean;
  mode: 'interactive' | 'readonly';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={`min-h-12 flex-1 items-center justify-center rounded-sm border px-3 py-2 ${
        isSelected
          ? 'border-border-strong bg-surface-elevated'
          : 'border-transparent'
      }`}
      disabled={mode === 'readonly'}
      onPress={onPress}
    >
      <Numeral variant="small">{driver.code}</Numeral>
    </Pressable>
  );
}
