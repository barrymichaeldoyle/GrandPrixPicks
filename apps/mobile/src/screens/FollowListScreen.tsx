import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import type { ProfileStackParamList } from '../navigation/types';
import { colors } from '../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParamList, 'FollowerList'>;

type UserRow = {
  _id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

export function FollowListScreen({ route, navigation }: Props) {
  const { username, tab: initialTab } = route.params;
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    initialTab,
  );

  const profile = useQuery(api.users.getProfileByUsername, { username });
  const followers = useQuery(
    api.follows.listFollowers,
    profile ? { userId: profile._id as ConvexId<'users'> } : 'skip',
  );
  const following = useQuery(
    api.follows.listFollowing,
    profile ? { userId: profile._id as ConvexId<'users'> } : 'skip',
  );

  if (profile === undefined) {
    return <LoadingScreen />;
  }
  if (profile === null) {
    return (
      <View style={styles.screen}>
        <Text style={styles.errorText}>User not found.</Text>
      </View>
    );
  }

  const list = activeTab === 'followers' ? followers : following;
  const isLoading = list === undefined;

  function handleUserPress(u: UserRow) {
    if (u.username) {
      navigation.push('PublicProfile', { username: u.username });
    }
  }

  return (
    <View style={styles.screen}>
      {/* Tab bar */}
      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            setActiveTab('followers');
          }}
          style={[
            styles.tab,
            activeTab === 'followers' ? styles.tabActive : null,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'followers' ? styles.tabTextActive : null,
            ]}
          >
            Followers
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setActiveTab('following');
          }}
          style={[
            styles.tab,
            activeTab === 'following' ? styles.tabActive : null,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'following' ? styles.tabTextActive : null,
            ]}
          >
            Following
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : !list || list.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={
            activeTab === 'followers'
              ? 'No followers yet'
              : 'Not following anyone'
          }
          body={
            activeTab === 'followers'
              ? "When people follow this account, they'll appear here."
              : 'Accounts this user follows will appear here.'
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={list as UserRow[]}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                handleUserPress(item);
              }}
              style={styles.row}
            >
              <Avatar
                name={item.displayName ?? item.username ?? '?'}
                size="md"
                src={item.avatarUrl}
              />
              <View style={styles.rowText}>
                <Text style={styles.rowName}>
                  {item.displayName ?? item.username ?? 'Unknown'}
                </Text>
                {item.username ? (
                  <Text style={styles.rowUsername}>@{item.username}</Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: colors.error,
    fontSize: 14,
    padding: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowUsername: {
    color: colors.textMuted,
    fontSize: 13,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  tab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text,
  },
  tabs: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
});
