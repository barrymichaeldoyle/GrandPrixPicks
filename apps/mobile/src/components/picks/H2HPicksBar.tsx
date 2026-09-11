import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { Pressable, Text, View } from '../../tw';
import type { DimensionValue } from 'react-native';

type H2HDriver = { _id: string; code: string };

export type H2HBarMatchup = {
  _id: string;
  team: string;
  driver1: H2HDriver;
  driver2: H2HDriver;
};

export function H2HPicksBar({
  matchups,
  selections,
  onSelectIndex,
}: {
  matchups: ReadonlyArray<H2HBarMatchup>;
  selections: Record<string, string | undefined>;
  onSelectIndex?: (index: number) => void;
}) {
  const interactive = onSelectIndex !== undefined;
  const columns = Math.min(matchups.length, 6);

  return (
    <View className="mt-2 flex-row flex-wrap gap-1">
      {matchups.map((matchup, index) => {
        const selectedId = selections[matchup._id];
        const picked = [matchup.driver1, matchup.driver2].find(
          (driver) => driver._id === selectedId,
        );
        const label = `Battle ${index + 1} of ${matchups.length}, ${displayTeamName(
          matchup.team,
        )}. ${picked ? `${picked.code} picked` : 'Not called yet'}.`;
        const className = `relative h-9 min-w-0 flex-row items-center justify-center overflow-hidden rounded-sm border pr-1 pl-2 ${
          picked
            ? 'border-border bg-surface-elevated'
            : 'border-dashed border-border bg-page'
        }`;
        const content = (
          <>
            <View
              className="absolute top-0 bottom-0 left-0 w-[3px]"
              style={{ backgroundColor: getTeamColor(matchup.team) }}
            />
            <Text
              className={`text-xs leading-none ${
                picked ? 'text-foreground' : 'text-muted'
              }`}
              numberOfLines={1}
            >
              {picked ? picked.code : String(index + 1)}
            </Text>
          </>
        );
        const widthPercent = `${100 / columns - 1.2}%` as DimensionValue;

        if (!interactive) {
          return (
            <View
              accessibilityLabel={label}
              className={className}
              key={matchup._id}
              style={{ width: widthPercent }}
            >
              {content}
            </View>
          );
        }

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            className={className}
            key={matchup._id}
            onPress={() => onSelectIndex(index)}
            style={{ width: widthPercent }}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}
