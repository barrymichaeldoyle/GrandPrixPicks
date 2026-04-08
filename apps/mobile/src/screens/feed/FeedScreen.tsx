import { useQuery } from 'convex/react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { FeedEvent } from '../../components/feed/FeedEventCard';
import { FeedEventCard } from '../../components/feed/FeedEventCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { api } from '../../integrations/convex/api';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

export function FeedScreen() {
  const { convexEnabled } = useMobileConfig();
  const { titleFontFamily } = useTypography();

  const result = useQuery(
    api.feed.getPersonalizedFeed,
    convexEnabled ? {} : 'skip',
  );

  const isLoading = result === undefined;
  const events = (result?.events ?? []) as FeedEvent[];

  if (!convexEnabled) {
    return (
      <View style={styles.screen}>
        <Text
          style={[
            styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          Feed
        </Text>
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
      <Text
        style={[
          styles.title,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        Feed
      </Text>
      <FlatList
        contentContainerStyle={
          events.length === 0 ? styles.emptyContainer : styles.listContent
        }
        data={events}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <EmptyState
            body="Picks from you and people you follow will show up here."
            icon="pulse-outline"
            title="Nothing here yet"
          />
        }
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            refreshing={false}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => <FeedEventCard event={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 12,
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
