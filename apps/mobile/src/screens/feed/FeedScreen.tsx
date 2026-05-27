import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { FeedEvent } from '../../components/feed/FeedEventCard';
import { FeedEventCard } from '../../components/feed/FeedEventCard';
import { HomeExplore } from '../../components/home/HomeExplore';
import { HomeHero } from '../../components/home/HomeHero';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { PageHero } from '../../components/ui/PageHero';
import { api } from '../../integrations/convex/api';
import type { HomeStackParamList } from '../../navigation/types';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors } from '../../theme/tokens';

export function FeedScreen() {
  const { convexEnabled } = useMobileConfig();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();

  const result = useQuery(
    api.feed.getPersonalizedFeed,
    convexEnabled ? {} : 'skip',
  );

  const isLoading = result === undefined;
  const events = (result?.events ?? []) as FeedEvent[];

  if (!convexEnabled) {
    return (
      <View style={styles.screen}>
        <PageHero
          subtitle="Live updates from you and the people you follow."
          title="Feed"
        />
        <EmptyState
          body="Configure your Convex URL to see your feed."
          icon="pulse-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={events}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={null}
        ListHeaderComponent={
          <View style={styles.header}>
            <HomeHero />
            {events.length > 0 ? (
              <Text style={styles.feedHeading}>Activity</Text>
            ) : (
              <HomeExplore />
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            refreshing={false}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <FeedEventCard
            event={item}
            onPress={() =>
              navigation.navigate('FeedEventDetail', {
                feedEventId: String(item._id),
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feedHeading: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  header: {
    gap: 8,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
