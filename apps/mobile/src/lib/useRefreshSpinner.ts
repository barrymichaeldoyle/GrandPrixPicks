import * as Haptics from 'expo-haptics';
import { useState } from 'react';

/**
 * Pull-to-refresh helper for Convex-backed screens.
 *
 * Convex queries are already real-time, so there's nothing to refetch — but
 * users expect the gesture to feel responsive. This shows the spinner for a
 * short window plus a haptic so the pull feels acknowledged.
 */
export function useRefreshSpinner(durationMs: number = 600) {
  const [refreshing, setRefreshing] = useState(false);

  function onRefresh() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, durationMs);
  }

  return { refreshing, onRefresh };
}
