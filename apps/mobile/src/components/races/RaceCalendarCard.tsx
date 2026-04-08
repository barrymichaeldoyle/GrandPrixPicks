import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getLockStatusViewModel } from '../../lib/lockTime';
import { useNow } from '../../lib/useNow';
import type { RaceWeekend } from '../../types';
import { LockBadge } from '../ui/LockBadge';
import { FlagImage } from '../ui/FlagImage';
import { colors, radii } from '../../theme/tokens';

type RaceCalendarCardProps = {
  race: RaceWeekend;
  onPress: () => void;
};

function getNextOpenSession(
  race: RaceWeekend,
  now: number,
): { type: SessionType; msRemaining: number } | null {
  for (const session of race.sessions) {
    const msRemaining = new Date(session.startsAt).getTime() - now;
    if (msRemaining > -2 * 60 * 60 * 1000) {
      // within 2h past lock = still relevant
      return { type: session.type as SessionType, msRemaining };
    }
  }
  return null;
}

export function RaceCalendarCard({ race, onPress }: RaceCalendarCardProps) {
  const now = useNow();
  const nextSession = getNextOpenSession(race, now);
  const lockStatus = nextSession
    ? getLockStatusViewModel(nextSession.msRemaining, now)
    : null;

  const weekendDate = new Date(race.weekendStart).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric' },
  );

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <FlagImage raceSlug={race.slug} />
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>
            {race.name}
          </Text>
          <Text style={styles.meta}>
            {race.country} · {weekendDate}
          </Text>
        </View>
        {lockStatus ? (
          <LockBadge lockStatus={lockStatus} />
        ) : (
          <View style={styles.finishedBadge}>
            <Text style={styles.finishedText}>Finished</Text>
          </View>
        )}
      </View>
      {race.hasSprint ? (
        <View style={styles.sprintBadge}>
          <Text style={styles.sprintText}>Sprint Weekend</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  finishedBadge: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  finishedText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  sprintBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sprintText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
});
