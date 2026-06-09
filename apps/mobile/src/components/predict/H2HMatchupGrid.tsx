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

const HAIRLINE = StyleSheet.hairlineWidth;

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
    <View>
      {matchups.map((matchup, index) => {
        const teamColor = getTeamColor(matchup.team);
        const selected = selections[matchup._id];

        return (
          <View key={matchup._id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              <View style={[styles.stripe, { backgroundColor: teamColor }]} />
              <Text numberOfLines={1} style={styles.team}>
                {matchup.team}
              </Text>
              <View style={styles.pickPair}>
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
          ? {
              backgroundColor: teamColor,
              borderColor: teamColor,
            }
          : null,
      ]}
    >
      <Text
        style={[
          styles.driverCode,
          isSelected ? styles.driverCodeSelected : null,
        ]}
      >
        {driver.code}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 7,
  },
  driverButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: HAIRLINE,
    minWidth: 56,
    paddingVertical: 7,
  },
  driverCode: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  driverCodeSelected: {
    color: '#fff',
  },
  empty: {
    paddingVertical: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  pickPair: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  stripe: {
    alignSelf: 'stretch',
    borderRadius: 1.5,
    width: 3,
  },
  team: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  vs: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
