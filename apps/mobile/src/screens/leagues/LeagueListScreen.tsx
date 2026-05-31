import { Ionicons } from '@expo/vector-icons';
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
import { useToast } from '../../providers/ToastProvider';
import { colors, radii } from '../../theme/tokens';

type Props = NativeStackScreenProps<LeaguesStackParamList, 'LeagueList'>;

const HAIRLINE = StyleSheet.hairlineWidth;

export function LeagueListScreen({ navigation }: Props) {
  const { convexEnabled } = useMobileConfig();
  const { showToast } = useToast();

  const leaguesQuery = useQuery(
    api.leagues.getMyLeagues,
    convexEnabled ? {} : 'skip',
  );

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
    if (!slug) {
      return;
    }
    setJoinError(null);
    setCommittedSlug(slug);
  }

  async function handleJoin() {
    if (!foundLeague) {
      return;
    }
    try {
      await joinLeague({
        leagueId: foundLeague._id as ConvexId<'leagues'>,
        password: passwordInput.trim() || undefined,
      });
      const name = foundLeague.name;
      setShowJoin(false);
      setSlugInput('');
      setCommittedSlug(null);
      setPasswordInput('');
      showToast(`Joined ${name}`, 'success');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join');
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  const leagues = (leaguesQuery ?? []).filter((league) => league !== null);
  const count = leagues.length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>Leagues</Text>
          <Text style={styles.title}>Your leagues</Text>
          <Text style={styles.headerMeta}>
            {count > 0
              ? `${count} ${count === 1 ? 'league' : 'leagues'}`
              : 'Join with a code to compete with friends'}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => {
            setShowJoin((v) => !v);
            setJoinError(null);
          }}
        >
          <Text style={styles.joinToggle}>
            {showJoin ? 'Cancel' : 'Join'}
          </Text>
        </Pressable>
      </View>

      {showJoin ? (
        <View style={styles.joinBlock}>
          <Text style={styles.sectionEyebrow}>Join by code</Text>
          <View style={styles.joinRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(v) => {
                setSlugInput(v);
                setCommittedSlug(null);
                setJoinError(null);
              }}
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
            <Text style={styles.joinError}>
              No league found for "{committedSlug}"
            </Text>
          ) : null}

          {foundLeague ? (
            <View style={styles.foundLeague}>
              <View>
                <Text style={styles.foundLeagueName}>{foundLeague.name}</Text>
                <Text style={styles.foundLeagueMeta}>
                  {foundLeague.memberCount} member
                  {foundLeague.memberCount !== 1 ? 's' : ''} · Season{' '}
                  {foundLeague.season}
                </Text>
              </View>
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
              {joinError ? (
                <Text style={styles.joinError}>{joinError}</Text>
              ) : null}
              <Pressable
                onPress={() => void handleJoin()}
                style={styles.confirmJoinButton}
              >
                <Text style={styles.confirmJoinText}>
                  Join {foundLeague.name}
                </Text>
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
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('LeagueDetail', { leagueSlug: item.slug })
              }
              style={styles.leagueRow}
            >
              <View style={styles.leagueInfo}>
                <Text numberOfLines={1} style={styles.leagueName}>
                  {item.name}
                </Text>
                <Text style={styles.leagueMeta}>
                  {item.memberCount} member
                  {item.memberCount !== 1 ? 's' : ''} · Season {item.season}
                </Text>
              </View>
              {item.viewerRole === 'admin' ? (
                <Text style={styles.adminTag}>ADMIN</Text>
              ) : null}
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={16}
              />
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Text style={styles.createBannerText}>
        Create leagues at grandprixpicks.com
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  adminTag: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  confirmJoinButton: {
    alignItems: 'center',
    backgroundColor: colors.buttonAccent,
    borderRadius: radii.lg,
    paddingVertical: 12,
  },
  confirmJoinText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  createBannerText: {
    color: colors.textMuted,
    fontSize: 11,
    paddingTop: 8,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  findButton: {
    alignItems: 'center',
    backgroundColor: colors.buttonAccent,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: HAIRLINE,
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  joinBlock: {
    gap: 10,
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
  joinToggle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  leagueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  listContent: {
    flexGrow: 1,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
