import { Ionicons } from '@expo/vector-icons';

import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { DriverBadge } from '../ui/DriverBadge';
import { NationalityFlag } from '../ui/FlagImage';
import type { H2HDuelDriver, H2HDuelMatchup } from './H2HDuelQuestion';

type H2HMatchupGridProps = {
  matchups: ReadonlyArray<H2HDuelMatchup>;
  selections: Record<string, string>;
  mode: 'interactive' | 'readonly';
  onSelect?: (matchupId: string, driverId: string) => void;
};

/**
 * Every battle at once, for someone editing a saved card, where scanning beats
 * stepping. Cells match web's `H2HMatchupGrid`: chip and number, flag and
 * surname, and a quiet Pick / Picked label.
 */
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
              <Text className="text-muted text-xs font-semibold tracking-wider uppercase">
                {displayTeamName(matchup.team)}
              </Text>
            </View>
            <View className="flex-row gap-1 p-1">
              {[matchup.driver1, matchup.driver2].map((driver) => (
                <DriverCell
                  driver={driver}
                  isSelected={selected === driver._id}
                  key={driver._id}
                  mode={mode}
                  onPress={() => onSelect?.(matchup._id, driver._id)}
                  team={driver.team ?? matchup.team}
                  teamLabel={displayTeamName(matchup.team)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DriverCell({
  driver,
  team,
  teamLabel,
  isSelected,
  mode,
  onPress,
}: {
  driver: H2HDuelDriver;
  team: string;
  teamLabel: string;
  isSelected: boolean;
  mode: 'interactive' | 'readonly';
  onPress: () => void;
}) {
  const isInteractive = mode === 'interactive';
  const surname = (driver.displayName ?? driver.code).split(' ').pop();

  return (
    <Pressable
      accessibilityLabel={`${teamLabel}: Pick ${driver.displayName ?? driver.code}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: !isInteractive }}
      className={`relative min-h-16 flex-1 rounded-sm border px-3 pt-1.5 pb-6 ${
        isSelected
          ? 'border-border-strong bg-surface-elevated'
          : 'border-transparent'
      }`}
      disabled={!isInteractive}
      onPress={onPress}
    >
      <View className="min-w-0 flex-row items-start gap-2">
        <View className="shrink-0 items-center">
          {/* Code and team only, so the chip doesn't swallow the pick tap. */}
          <DriverBadge code={driver.code} team={team} />
          {driver.number != null ? (
            <Text className="text-muted mt-1 text-xs leading-none">
              #{driver.number}
            </Text>
          ) : null}
        </View>
        <View className="min-w-0 flex-1 flex-row items-center gap-1 pt-1">
          {driver.nationality ? (
            <NationalityFlag code={driver.nationality} />
          ) : null}
          <Text className="text-foreground shrink text-xs" numberOfLines={1}>
            {surname}
          </Text>
        </View>
      </View>
      <View className="absolute right-3 bottom-1.5 flex-row items-center gap-1">
        {isSelected ? (
          <>
            <Ionicons color={colors.accent} name="checkmark" size={12} />
            <Text className="text-muted text-xs font-semibold">Picked</Text>
          </>
        ) : isInteractive ? (
          <Text className="text-muted text-xs font-semibold">Pick</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
