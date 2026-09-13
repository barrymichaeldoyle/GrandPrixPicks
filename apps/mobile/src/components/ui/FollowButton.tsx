import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { useFollowMutations } from '../../hooks/useFollowMutations';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { useToast } from '../../providers/ToastProvider';
import { colors } from '../../theme/tokens';
import { Pressable, Text } from '../../tw';

/**
 * One follow/unfollow control, matching web's `FollowButton`: same icon +
 * colour system (accent pill not-following, muted pill following), same
 * `compact` size for a dense list, same optimistic follow state.
 *
 * Self-contained like web's, not a dumb button that leaves the caller to
 * wire up state: `PublicProfileScreen` and the feed's players-to-follow list
 * each grew their own bespoke bordered button before this, so a colour or
 * copy change had two places to make it and only one of them got it. The
 * follow query already updates optimistically the instant the mutation
 * fires (`applyFollowToStore`), so there is no local "optimistic" state to
 * duplicate here — this just reads it.
 */
export function FollowButton({
  followeeId,
  source = 'follow_button',
  isFollowing: isFollowingProp,
  compact = false,
}: {
  followeeId: ConvexId<'users'>;
  source?: string;
  /** Pass this when the caller already knows the follow state, to skip a
   *  per-row query. Omit it and the button fetches its own. */
  isFollowing?: boolean;
  /** Shrinks the button for a dense list of rows, matching web's `compact`. */
  compact?: boolean;
}) {
  const { showToast } = useToast();
  const queriedIsFollowing = useQuery(
    api.follows.isFollowing,
    isFollowingProp === undefined ? { followeeId } : 'skip',
  );
  const isFollowing = isFollowingProp ?? queriedIsFollowing;
  const { follow, unfollow } = useFollowMutations();

  if (isFollowing === undefined) {
    return null;
  }

  async function handlePress() {
    const willFollow = !isFollowing;
    void Haptics.selectionAsync();
    try {
      if (willFollow) {
        await follow({ followeeId });
        captureAnalyticsEvent('user_followed', {
          followee_id: String(followeeId),
          source,
        });
      } else {
        await unfollow({ followeeId });
        captureAnalyticsEvent('user_unfollowed', {
          followee_id: String(followeeId),
          source,
        });
      }
    } catch {
      showToast(
        willFollow
          ? 'Could not follow that player. Try again.'
          : 'Could not unfollow that player. Try again.',
        'error',
      );
    }
  }

  const iconSize = compact ? 12 : 14;
  const iconColor = isFollowing ? colors.textMuted : colors.accentHover;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isFollowing }}
      className={`flex-row items-center justify-center gap-1.5 rounded-full border ${
        compact ? 'px-3 py-1.5' : 'min-h-11 min-w-28 px-4 py-2'
      } ${
        isFollowing
          ? 'border-border bg-surface-muted'
          : 'border-accent/30 bg-accent-muted/40'
      }`}
      onPress={() => void handlePress()}
    >
      <Ionicons
        color={iconColor}
        name={isFollowing ? 'checkmark-outline' : 'person-add-outline'}
        size={iconSize}
      />
      <Text
        className={`${compact ? 'text-xs' : 'text-sm'} font-bold ${
          isFollowing ? 'text-muted' : 'text-accent-hover'
        }`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Text>
    </Pressable>
  );
}
