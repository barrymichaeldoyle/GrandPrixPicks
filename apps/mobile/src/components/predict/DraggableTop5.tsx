import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConvexDoc } from '../../integrations/convex/api';
import { getTeamColor } from '../../lib/teamColors';
import { colors, radii } from '../../theme/tokens';

type Driver = ConvexDoc<'drivers'>;

type DraggableTop5Props = {
  picks: string[];
  drivers: Driver[];
  onChange: (picks: string[]) => void;
  disabled?: boolean;
};

const MAX_PICKS = 5;

function RankedSlot({
  position,
  driver,
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  position: number;
  driver: Driver | undefined;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const teamColor = getTeamColor(driver?.team);
  const isEmpty = !driver;

  return (
    <View style={[styles.slot, isEmpty ? styles.slotEmpty : null]}>
      <View
        style={[
          styles.slotAccent,
          { backgroundColor: isEmpty ? colors.border : teamColor },
        ]}
      />
      <Text style={styles.slotPosition}>P{position}</Text>
      <View style={styles.slotDriver}>
        {driver ? (
          <>
            <Text style={styles.slotCode}>{driver.code}</Text>
            <Text numberOfLines={1} style={styles.slotName}>
              {driver.displayName}
            </Text>
          </>
        ) : (
          <Text style={styles.slotPlaceholder}>—</Text>
        )}
      </View>
      {driver && !disabled ? (
        <View style={styles.slotActions}>
          <Pressable
            disabled={!canMoveUp}
            onPress={onMoveUp}
            style={[
              styles.arrowButton,
              !canMoveUp ? styles.arrowDisabled : null,
            ]}
          >
            <Ionicons
              color={canMoveUp ? colors.text : colors.textMuted}
              name="chevron-up"
              size={14}
            />
          </Pressable>
          <Pressable
            disabled={!canMoveDown}
            onPress={onMoveDown}
            style={[
              styles.arrowButton,
              !canMoveDown ? styles.arrowDisabled : null,
            ]}
          >
            <Ionicons
              color={canMoveDown ? colors.text : colors.textMuted}
              name="chevron-down"
              size={14}
            />
          </Pressable>
          <Pressable onPress={onRemove} style={styles.removeButton}>
            <Ionicons color={colors.textMuted} name="close" size={14} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function PoolDriverCard({
  driver,
  inPicks,
  poolFull,
  disabled,
  onPress,
}: {
  driver: Driver;
  inPicks: boolean;
  poolFull: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const teamColor = getTeamColor(driver.team);
  const isDisabled = disabled || (!inPicks && poolFull);

  return (
    <Pressable
      disabled={isDisabled && !inPicks}
      onPress={onPress}
      style={[
        styles.poolCard,
        inPicks ? styles.poolCardSelected : null,
        isDisabled && !inPicks ? styles.poolCardDisabled : null,
      ]}
    >
      <View style={[styles.poolTeamDot, { backgroundColor: teamColor }]} />
      <Text style={[styles.poolCode, inPicks ? styles.poolCodeSelected : null]}>
        {driver.code}
      </Text>
      <Text numberOfLines={1} style={styles.poolName}>
        {driver.displayName}
      </Text>
    </Pressable>
  );
}

export function DraggableTop5({
  picks,
  drivers,
  onChange,
  disabled = false,
}: DraggableTop5Props) {
  const driverMap = new Map<string, Driver>(
    drivers.map((d) => [d._id as string, d]),
  );
  const pickSet = new Set(picks);
  const poolFull = picks.length >= MAX_PICKS;

  function handlePoolTap(driverId: string) {
    if (pickSet.has(driverId)) {
      // Remove from picks
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(picks.filter((id) => id !== driverId));
    } else if (!poolFull) {
      // Add to next empty slot
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onChange([...picks, driverId]);
    }
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= picks.length) {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...picks];
    [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
    onChange(next);
  }

  function handleRemove(index: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(picks.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      {/* Ranked slots */}
      <View style={styles.slots}>
        {Array.from({ length: MAX_PICKS }).map((_, i) => {
          const driverId = picks[i];
          const driver = driverId ? driverMap.get(driverId) : undefined;
          return (
            <RankedSlot
              key={i}
              canMoveDown={i < picks.length - 1}
              canMoveUp={i > 0}
              disabled={disabled}
              driver={driver}
              onMoveDown={() => handleMove(i, 'down')}
              onMoveUp={() => handleMove(i, 'up')}
              onRemove={() => handleRemove(i)}
              position={i + 1}
            />
          );
        })}
      </View>

      {/* Pool */}
      {!disabled ? (
        <View style={styles.pool}>
          <Text style={styles.poolHeader}>
            {poolFull
              ? 'Tap a pick above to remove'
              : `${MAX_PICKS - picks.length} remaining — tap to add`}
          </Text>
          <FlatList
            data={drivers}
            keyExtractor={(d) => d._id}
            numColumns={3}
            columnWrapperStyle={styles.poolRow}
            renderItem={({ item }) => (
              <PoolDriverCard
                driver={item}
                disabled={disabled}
                inPicks={pickSet.has(item._id)}
                onPress={() => handlePoolTap(item._id)}
                poolFull={poolFull}
              />
            )}
            scrollEnabled={false}
          />
        </View>
      ) : (
        <View style={styles.lockedNote}>
          <Ionicons
            color={colors.textMuted}
            name="lock-closed-outline"
            size={14}
          />
          <Text style={styles.lockedNoteText}>
            Session locked — picks are read-only
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  arrowButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  container: {
    gap: 12,
  },
  lockedNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  lockedNoteText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  pool: {
    gap: 8,
  },
  poolCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    margin: 3,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  poolCardDisabled: {
    opacity: 0.3,
  },
  poolCardSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  poolCode: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  poolCodeSelected: {
    color: colors.accent,
  },
  poolHeader: {
    color: colors.textMuted,
    fontSize: 12,
  },
  poolName: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  poolRow: {
    gap: 0,
  },
  poolTeamDot: {
    borderRadius: 4,
    height: 4,
    width: 20,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  slot: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    overflow: 'hidden',
    paddingRight: 10,
    paddingVertical: 10,
  },
  slotAccent: {
    alignSelf: 'stretch',
    width: 4,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 4,
  },
  slotCode: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  slotDriver: {
    flex: 1,
    gap: 2,
  },
  slotEmpty: {
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  slotName: {
    color: colors.textMuted,
    fontSize: 11,
  },
  slotPlaceholder: {
    color: colors.textMuted,
    fontSize: 14,
  },
  slotPosition: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    width: 26,
  },
  slots: {
    gap: 8,
  },
});
