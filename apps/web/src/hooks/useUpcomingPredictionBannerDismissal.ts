import { useEffect, useState } from 'react';

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
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!raceSlug) {
      setDismissed(false);
      return;
    }
    setDismissed(isDismissed(raceSlug, nudgeKind));
  }, [nudgeKind, raceSlug]);

  function dismiss() {
    if (raceSlug) {
      recordDismissal(raceSlug, nudgeKind);
    }
    setDismissed(true);
  }

  return { dismissed, dismiss };
}
