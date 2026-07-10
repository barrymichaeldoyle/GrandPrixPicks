import { getTeamColor } from '../../lib/teamColors';
import { Pressable, Text, View } from '../../tw';

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
    <View>
      {matchups.map((matchup, index) => {
        const teamColor = getTeamColor(matchup.team);
        const selected = selections[matchup._id];

        return (
          <View key={matchup._id}>
            {index > 0 ? <View className="ml-[7px] h-px bg-border" /> : null}
            <View className="flex-row items-center gap-2.5 py-2.5">
              <View
                className="w-[3px] self-stretch rounded-sm"
                style={{ backgroundColor: teamColor }}
              />
              <Text
                className="text-foreground flex-1 text-xs font-bold"
                numberOfLines={1}
              >
                {matchup.team}
              </Text>
              <View className="flex-row items-center gap-2">
                <DriverButton
                  driver={matchup.driver1}
                  isSelected={selected === matchup.driver1._id}
                  mode={mode}
                  onPress={() => onSelect?.(matchup._id, matchup.driver1._id)}
                  teamColor={teamColor}
                />
                <Text className="text-muted text-[10px] font-bold uppercase">
                  vs
                </Text>
                <DriverButton
                  driver={matchup.driver2}
                  isSelected={selected === matchup.driver2._id}
                  mode={mode}
                  onPress={() => onSelect?.(matchup._id, matchup.driver2._id)}
                  teamColor={teamColor}
                />
              </View>
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
  teamColor,
}: {
  driver: H2HDriver;
  isSelected: boolean;
  mode: 'interactive' | 'readonly';
  onPress: () => void;
  teamColor: string;
}) {
  return (
    <Pressable
      disabled={mode === 'readonly'}
      className="min-w-14 items-center rounded-md border border-border py-[7px]"
      onPress={onPress}
      style={
        isSelected
          ? { backgroundColor: teamColor, borderColor: teamColor }
          : undefined
      }
    >
      <Text
        className={`text-[13px] font-extrabold ${
          isSelected ? 'text-white' : 'text-foreground'
        }`}
      >
        {driver.code}
      </Text>
    </Pressable>
  );
}
