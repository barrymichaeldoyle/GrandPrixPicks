import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import type { RaceWeekend } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';
import { BigCountdown } from '../ui/BigCountdown';
import { HeroSpeedLines } from '../ui/HeroSpeedLines';
import { Numeral } from '../ui/Numeral';

type NextSession = {
  type: string;
  label: string;
  startAt: number;
};

const SESSION_LABEL: Record<string, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

function getFeatured(
  races: ReadonlyArray<RaceWeekend>,
  now: number,
): { race: RaceWeekend; round: number; nextSession: NextSession | null } | null {
  const sorted = races
    .slice()
    .sort(
      (a, b) =>
        new Date(a.weekendStart).getTime() - new Date(b.weekendStart).getTime(),
    );
  const upcomingIndex = sorted.findIndex(
    (r) =>
      r.sessions.length === 0 ||
      new Date(r.sessions[r.sessions.length - 1].startsAt).getTime() > now,
  );
  if (upcomingIndex === -1) {
    return null;
  }
  const race = sorted[upcomingIndex];
  const round = upcomingIndex + 1;
  let nextSession: NextSession | null = null;
  for (const session of race.sessions) {
    const startAt = new Date(session.startsAt).getTime();
    if (startAt > now) {
      nextSession = {
        type: session.type,
        label: SESSION_LABEL[session.type] ?? session.type,
        startAt,
      };
      break;
    }
  }
  return { race, round, nextSession };
}

export function HomeHero() {
  const { titleFontFamily } = useTypography();
  const { races } = useRaceWeekends();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();

  const featured = getFeatured(races, Date.now());
  if (!featured) {
    return null;
  }
  const { race, round, nextSession } = featured;
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const totalRounds = races.length;

  return (
    <View style={styles.halo}>
      <Pressable
        onPress={() =>
          navigation.navigate('RaceDetail', { raceSlug: race.slug })
        }
        style={styles.container}
      >
        <HeroSpeedLines />
      <View style={styles.content}>
        <View style={styles.identity}>
          {countryCode ? (
            <View style={styles.flagBadge}>
              <Image
                source={{ uri: `https://flagcdn.com/w160/${countryCode}.png` }}
                style={styles.flagImage}
              />
            </View>
          ) : null}
          <Text
            numberOfLines={2}
            style={[
              styles.raceName,
              titleFontFamily ? { fontFamily: titleFontFamily } : null,
            ]}
          >
            {race.name}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>ROUND</Text>
          <Numeral style={styles.metaNumeral} tone="muted" variant="small">
            {round}
          </Numeral>
          {totalRounds > 0 ? (
            <Text style={styles.metaLabel}>{` / ${totalRounds}`}</Text>
          ) : null}
          {race.hasSprint ? (
            <>
              <Text style={styles.metaDivider}>·</Text>
              <Text style={styles.metaAccent}>SPRINT WEEKEND</Text>
            </>
          ) : null}
        </View>

        {nextSession ? (
          <>
            <View style={styles.countdownWrapper}>
              <BigCountdown targetAt={nextSession.startAt} />
            </View>
            <Text style={styles.countdownCopy}>
              until{' '}
              <Text style={styles.countdownTarget}>{nextSession.label}</Text>
            </Text>
          </>
        ) : (
          <Text style={styles.weekendOver}>Weekend complete</Text>
        )}

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Make predictions</Text>
          <Ionicons
            color={colors.accentHover}
            name="arrow-forward"
            size={14}
          />
        </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
    borderColor: 'rgba(45, 212, 191, 0.45)',
    borderRadius: radii.xl,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  halo: {
    borderRadius: radii.xl,
    elevation: 10,
    marginBottom: 16,
    shadowColor: colors.accent,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    position: 'relative',
  },
  countdownCopy: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  countdownTarget: {
    color: colors.text,
    fontWeight: '700',
  },
  countdownWrapper: {
    marginTop: 4,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
    borderColor: 'rgba(45, 212, 191, 0.55)',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ctaText: {
    color: colors.accentHover,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  flagBadge: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.md,
    borderWidth: 1,
    height: 34,
    overflow: 'hidden',
    width: 50,
  },
  flagImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  metaAccent: {
    color: colors.accentHover,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  metaDivider: {
    color: colors.borderStrong,
    fontSize: 10,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  metaNumeral: {
    color: colors.textMuted,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  raceName: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  weekendOver: {
    color: colors.accentHover,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
