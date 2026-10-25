import { useState } from 'react';

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

type UpcomingPredictionBannerNudgeKind = 'top5' | 'h2h';

function getStorageKey(
  raceSlug: string,
  nudgeKind: UpcomingPredictionBannerNudgeKind,
) {
  return `upcoming-prediction-banner-dismissed:${raceSlug}:${nudgeKind}`;
}

function isDismissed(
  raceSlug: string,
  nudgeKind: UpcomingPredictionBannerNudgeKind,
): boolean {
  try {
    const value = localStorage.getItem(getStorageKey(raceSlug, nudgeKind));
    if (!value) {
      return false;
    }
    return Date.now() < Number(value);
  } catch {
    return false;
  }
}

function recordDismissal(
  raceSlug: string,
  nudgeKind: UpcomingPredictionBannerNudgeKind,
): void {
  try {
    localStorage.setItem(
      getStorageKey(raceSlug, nudgeKind),
      String(Date.now() + DISMISS_TTL_MS),
    );
  } catch {
    // ignore
  }
}

export function useUpcomingPredictionBannerDismissal(
  raceSlug?: string | null,
  nudgeKind: UpcomingPredictionBannerNudgeKind = 'top5',
) {
  // Read from storage on the render that needs it, not in an effect after it:
  // with the banner's queries already cached, a dismissed banner painted for a
  // frame before the effect hid it. Safe without a hydration guard because the
  // banner only mounts client-side (`DeferredAuthenticatedFeatures`).
  const key = raceSlug ? getStorageKey(raceSlug, nudgeKind) : null;
  const [state, setState] = useState(() => ({
    key,
    dismissed: raceSlug ? isDismissed(raceSlug, nudgeKind) : false,
  }));
  // A new storage key defines a new dismissal state.
  if (state.key !== key) {
    setState({
      key,
      dismissed: raceSlug ? isDismissed(raceSlug, nudgeKind) : false,
    });
  }

  function dismiss() {
    if (raceSlug) {
      recordDismissal(raceSlug, nudgeKind);
    }
    setState({ key, dismissed: true });
  }

  return { dismissed: state.key === key && state.dismissed, dismiss };
}
