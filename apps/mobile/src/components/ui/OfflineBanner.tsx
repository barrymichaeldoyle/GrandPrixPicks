import { Ionicons } from './Ionicons';
import { useConvexConnectionState } from 'convex/react';
import { useEffect, useState } from 'react';

import { colors } from '../../theme/tokens';
import { Text, View } from '../../tw';

/**
 * Long enough that a tunnel or a lift does not flash a banner at someone who
 * never noticed. Matches the web's delay.
 */
const OFFLINE_DELAY_MS = 3000;

/**
 * A cold start with no connection never connects, so `hasEverConnected`
 * alone kept the banner off for exactly the launch that needed it. After this
 * long without a first connection, say so.
 */
const FIRST_CONNECT_GRACE_MS = 8000;

/**
 * Says so when the app cannot reach Convex.
 *
 * Mobile needs this more than the web does, and had none: connectivity drops
 * constantly on a phone, and this app's whole premise is a deadline. Silently
 * failing to submit picks because the train went into a tunnel is the worst
 * failure this product has, and it was invisible.
 *
 * The signal is the Convex socket rather than a network library, because
 * reaching the backend is the thing that actually matters and it needs no new
 * dependency. A cold start gets a longer grace period, since the first
 * connection taking a few seconds is not an outage.
 */
export function OfflineBanner() {
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  const [visible, setVisible] = useState(false);

  const isOffline = !isWebSocketConnected;
  const delayMs = hasEverConnected ? OFFLINE_DELAY_MS : FIRST_CONNECT_GRACE_MS;

  useEffect(() => {
    if (!isOffline) {
      // Convex connection state is external; reconnecting cancels the delay.
      // oxlint-disable-next-line react/set-state-in-effect
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, isOffline]);

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="flex-row items-center justify-center gap-2 border-b border-border bg-surface px-4 py-2"
    >
      <Ionicons color={colors.textMuted} name="cloud-offline" size={14} />
      <Text className="text-muted text-xs font-semibold">
        No connection. Picks will not save until you are back online.
      </Text>
    </View>
  );
}
