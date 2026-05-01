import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getTeamColor } from '../../lib/teamColors';
import { colors, radii } from '../../theme/tokens';

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
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No H2H matchups for this season.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {matchups.map((matchup) => {
        const teamColor = getTeamColor(matchup.team);
        const selected = selections[matchup._id];

        return (
          <View key={matchup._id} style={styles.matchup}>
            <View style={styles.matchupHeader}>
              <View style={[styles.teamDot, { backgroundColor: teamColor }]} />
              <Text style={styles.teamName}>{matchup.team}</Text>
            </View>
            <View style={styles.matchupRow}>
              <DriverButton
                driver={matchup.driver1}
                isSelected={selected === matchup.driver1._id}
                mode={mode}
                onPress={() => onSelect?.(matchup._id, matchup.driver1._id)}
                teamColor={teamColor}
              />
              <Text style={styles.vs}>vs</Text>
              <DriverButton
                driver={matchup.driver2}
                isSelected={selected === matchup.driver2._id}
                mode={mode}
                onPress={() => onSelect?.(matchup._id, matchup.driver2._id)}
                teamColor={teamColor}
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
      onPress={onPress}
      style={[
        styles.driverButton,
        isSelected
          ? { backgroundColor: teamColor + '33', borderColor: teamColor }
          : null,
      ]}
    >
      <Text
        style={[styles.driverCode, isSelected ? { color: teamColor } : null]}
      >
        {driver.code}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  driverButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  driverCode: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    paddingVertical: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  grid: {
    gap: 8,
  },
  matchup: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  matchupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  matchupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  teamDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  teamName: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  vs: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
