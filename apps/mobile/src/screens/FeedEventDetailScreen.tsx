import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { FeedEvent } from '../components/feed/FeedEventCard';
import { FeedEventCard } from '../components/feed/FeedEventCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useQuery } from '../integrations/convex/query';
import type { HomeStackParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { ScrollView, View } from '../tw';

type Props = NativeStackScreenProps<HomeStackParamList, 'FeedEventDetail'>;

export function FeedEventDetailScreen({ route }: Props) {
  const { convexEnabled } = useMobileConfig();
  const feedEventId = route.params.feedEventId as ConvexId<'feedEvents'>;
  const detail = useQuery(
    api.feed.getFeedEvent,
    convexEnabled ? { feedEventId } : 'skip',
  );

  if (!convexEnabled) {
    return (
      <View className="flex-1 bg-page">
        <EmptyState
          body="Configure Convex to view this prediction."
          icon="cloud-offline-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (detail === undefined) {
    return <LoadingScreen />;
  }

  if (detail === null) {
    return (
      <View className="flex-1 bg-page">
        <EmptyState
          body="This feed item doesn't exist or is no longer available."
          icon="alert-circle-outline"
          title="Not found"
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="px-4 pb-8 pt-3"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <FeedEventCard event={detail.event as FeedEvent} />
    </ScrollView>
  );
}
