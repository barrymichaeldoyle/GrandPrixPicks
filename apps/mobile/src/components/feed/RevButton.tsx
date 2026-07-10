import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';

import { api, type ConvexId } from '../../integrations/convex/api';
import { Pressable, Text } from '../../tw';

type RevButtonProps = {
  feedEventId: ConvexId<'feedEvents'>;
  revCount: number;
  viewerHasReved: boolean;
};

export function RevButton({
  feedEventId,
  revCount,
  viewerHasReved,
}: RevButtonProps) {
  const giveRev = useMutation(api.feed.giveRev);
  const removeRev = useMutation(api.feed.removeRev);

  function handlePress() {
    if (viewerHasReved) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void removeRev({ feedEventId });
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void giveRev({ feedEventId });
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
        viewerHasReved
          ? 'border-accent bg-accent-muted'
          : 'border-border active:bg-surface-elevated'
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          viewerHasReved ? 'text-accent' : 'text-muted'
        }`}
      >
        ⚡ {revCount > 0 ? revCount : ''}
      </Text>
    </Pressable>
  );
}
