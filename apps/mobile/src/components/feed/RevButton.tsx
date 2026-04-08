import { useMutation } from 'convex/react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { api, type ConvexId } from '../../integrations/convex/api';
import { colors, radii } from '../../theme/tokens';

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
      void removeRev({ feedEventId });
    } else {
      void giveRev({ feedEventId });
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, viewerHasReved ? styles.active : null]}
    >
      <Text style={[styles.label, viewerHasReved ? styles.activeLabel : null]}>
        ⚡ {revCount > 0 ? revCount : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  active: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  activeLabel: {
    color: colors.accent,
  },
  button: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
