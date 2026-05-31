import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useUserDateFormat } from '../../lib/dates';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { useNow } from '../../lib/useNow';
import type { RaceWeekend } from '../../types';
import { colors, radii } from '../../theme/tokens';

type RaceCardProps = {
  race: RaceWeekend;
  /** True when this race is the next predictable race. Adds a subtle accent treatment. */
  isNext?: boolean;
  /** Round number (1-indexed). */
  round?: number;
  onPress: () => void;
};

function getRaceSession(race: RaceWeekend) {
  return race.sessions.find((s) => s.type === 'race') ?? race.sessions[0];
}

function getFirstOpenSession(race: RaceWeekend, now: number) {
  for (const session of race.sessions) {
    const startsAt = new Date(session.startsAt).getTime();
    if (startsAt > now) {
      return { type: session.type, startsAt };
    }
  }
  return null;
}

function isWeekendFullyPast(race: RaceWeekend, now: number) {
  return (
    race.sessions.length > 0 &&
    race.sessions.every((s) => new Date(s.startsAt).getTime() <= now)
  );
}

function formatLockDistance(ms: number): string {
  if (ms <= 0) {
    return 'locked';
  }
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function RaceCard({ race, isNext, round, onPress }: RaceCardProps) {
  const now = useNow();
  const { formatDay, formatMonth } = useUserDateFormat();
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const raceSession = getRaceSession(race);
  const firstOpen = getFirstOpenSession(race, now);
  const isFullyPast = isWeekendFullyPast(race, now);

  const day = raceSession ? formatDay(raceSession.startsAt) : '—';
  const month = raceSession
    ? formatMonth(raceSession.startsAt).toUpperCase()
    : '—';

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        isNext ? styles.rowNext : null,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.dateBlock}>
        <Text style={[styles.month, isNext ? styles.monthNext : null]}>
          {month}
        </Text>
        <Text style={[styles.day, isNext ? styles.dayNext : null]}>{day}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          {countryCode ? (
            <View style={styles.flagFrame}>
              <Image
                source={{ uri: `https://flagcdn.com/w160/${countryCode}.png` }}
                style={styles.flag}
              />
            </View>
          ) : null}
          {round != null ? (
            <Text style={styles.roundLabel}>ROUND {round}</Text>
          ) : null}
          {race.hasSprint ? (
            <Text style={styles.sprintLabel}>SPRINT</Text>
          ) : null}
          {isFullyPast ? (
            <Text style={styles.finishedLabel}>FINISHED</Text>
          ) : null}
        </View>
        <Text
          numberOfLines={2}
          style={[styles.name, isFullyPast ? styles.nameFaded : null]}
        >
          {race.name}
        </Text>
        {isNext && firstOpen ? (
          <Text style={styles.lockLine}>
            <Text style={styles.lockAccent}>Picks lock in </Text>
            <Text style={styles.lockValue}>
              {formatLockDistance(firstOpen.startsAt - now)}
            </Text>
          </Text>
        ) : null}
      </View>

      <Ionicons
        color={isNext ? colors.accentHover : colors.textMuted}
        name="chevron-forward"
        size={18}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 4,
  },
  dateBlock: {
    alignItems: 'center',
    minWidth: 44,
  },
  day: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  dayNext: {
    color: colors.accentHover,
  },
  divider: {
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    width: StyleSheet.hairlineWidth,
  },
  finishedLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  flag: {
    height: '100%',
    width: '100%',
  },
  flagFrame: {
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    height: 14,
    overflow: 'hidden',
    width: 22,
  },
  lockAccent: {
    color: colors.textMuted,
    fontSize: 12,
  },
  lockLine: {
    marginTop: 2,
  },
  lockValue: {
    color: colors.accentHover,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  month: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  monthNext: {
    color: colors.accentHover,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nameFaded: {
    color: colors.textMuted,
  },
  roundLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowNext: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderColor: colors.accent,
    borderWidth: 1,
  },
  rowPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  sprintLabel: {
    color: colors.accentHover,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
