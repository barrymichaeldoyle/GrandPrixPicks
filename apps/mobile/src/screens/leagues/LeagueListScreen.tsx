import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import type { LeaguesStackParamList } from '../../navigation/types';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

type Props = NativeStackScreenProps<LeaguesStackParamList, 'LeagueList'>;

export function LeagueListScreen({ navigation }: Props) {
  const { titleFontFamily } = useTypography();
  const { convexEnabled } = useMobileConfig();

  const leaguesQuery = useQuery(api.leagues.getMyLeagues, convexEnabled ? {} : 'skip');

  const [showJoin, setShowJoin] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [committedSlug, setCommittedSlug] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const foundLeague = useQuery(
    api.leagues.getLeagueBySlug,
    convexEnabled && committedSlug ? { slug: committedSlug } : 'skip',
  );
  const joinLeague = useMutation(api.leagues.joinLeague);

  const isLoading = convexEnabled && leaguesQuery === undefined;

  function handleFind() {
    const slug = slugInput.trim().toLowerCase();
    if (!slug) {return;}
    setJoinError(null);
    setCommittedSlug(slug);
  }

  async function handleJoin() {
    if (!foundLeague) {return;}
    try {
      await joinLeague({
        leagueId: foundLeague._id as ConvexId<'leagues'>,
        password: passwordInput.trim() || undefined,
      });
      setShowJoin(false);
      setSlugInput('');
      setCommittedSlug(null);
      setPasswordInput('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join');
    }
  }

  if (isLoading) {return <LoadingScreen />;}

  const leagues = (leaguesQuery ?? []).filter((league) => league !== null);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={[styles.title, titleFontFamily ? { fontFamily: titleFontFamily } : null]}>
          Leagues
        </Text>
        <Pressable onPress={() => { setShowJoin((v) => !v); setJoinError(null); }} style={styles.joinButton}>
          <Text style={styles.joinButtonText}>{showJoin ? 'Cancel' : 'Join'}</Text>
        </Pressable>
      </View>

      {/* Join flow */}
      {showJoin ? (
        <View style={styles.joinCard}>
          <Text style={styles.joinTitle}>Join by code</Text>
          <View style={styles.joinRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(v) => { setSlugInput(v); setCommittedSlug(null); setJoinError(null); }}
              placeholder="league-slug"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={slugInput}
            />
            <Pressable onPress={handleFind} style={styles.findButton}>
              <Text style={styles.findButtonText}>Find</Text>
            </Pressable>
          </View>

          {committedSlug && foundLeague === undefined ? (
            <Text style={styles.joinMeta}>Searching…</Text>
          ) : null}

          {committedSlug && foundLeague === null ? (
            <Text style={styles.joinError}>No league found for "{committedSlug}"</Text>
          ) : null}

          {foundLeague ? (
            <View style={styles.foundLeague}>
              <Text style={styles.foundLeagueName}>{foundLeague.name}</Text>
              <Text style={styles.foundLeagueMeta}>
                {foundLeague.memberCount} member{foundLeague.memberCount !== 1 ? 's' : ''} · Season {foundLeague.season}
              </Text>
              {foundLeague.hasPassword ? (
                <TextInput
                  onChangeText={setPasswordInput}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  style={styles.input}
                  value={passwordInput}
                />
              ) : null}
              {joinError ? <Text style={styles.joinError}>{joinError}</Text> : null}
              <Pressable onPress={() => void handleJoin()} style={styles.confirmJoinButton}>
                <Text style={styles.confirmJoinText}>Join {foundLeague.name}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {leagues.length === 0 && !showJoin ? (
        <EmptyState
          body="Join a league with a code or create one on grandprixpicks.com."
          icon="people-outline"
          title="No leagues yet"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={leagues}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('LeagueDetail', { leagueSlug: item.slug })}
              style={styles.leagueCard}
            >
              <View style={styles.leagueCardRow}>
                <View style={styles.leagueInfo}>
                  <Text numberOfLines={1} style={styles.leagueName}>{item.name}</Text>
                  <Text style={styles.leagueMeta}>
                    {item.memberCount} member{item.memberCount !== 1 ? 's' : ''} · Season {item.season}
                  </Text>
                </View>
                <View style={[styles.roleBadge, item.viewerRole === 'admin' ? styles.adminBadge : null]}>
                  <Text style={[styles.roleText, item.viewerRole === 'admin' ? styles.adminText : null]}>
                    {item.viewerRole === 'admin' ? 'Admin' : 'Member'}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create league CTA */}
      <View style={styles.createBanner}>
        <Text style={styles.createBannerText}>
          Create leagues at grandprixpicks.com
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  adminText: {
    color: colors.accent,
  },
  confirmJoinButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 12,
  },
  confirmJoinText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  createBanner: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  createBannerText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  findButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  findButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  foundLeague: {
    gap: 8,
  },
  foundLeagueMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  foundLeagueName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  joinButton: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  joinButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  joinCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  joinError: {
    color: colors.error,
    fontSize: 12,
  },
  joinMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  leagueCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: 14,
  },
  leagueCardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  leagueInfo: {
    flex: 1,
    gap: 3,
  },
  leagueMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  leagueName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    flex: 1,
    gap: 10,
  },
  roleBadge: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 38,
  },
});
