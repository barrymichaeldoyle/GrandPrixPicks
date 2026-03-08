import { useEffect, useMemo, useState } from 'react';

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

function getStorageKey(raceSlug: string) {
  return `upcoming-prediction-banner-dismissed:${raceSlug}`;
}

function isDismissed(raceSlug: string): boolean {
  try {
    const value = localStorage.getItem(getStorageKey(raceSlug));
    if (!value) {
      return false;
    }
    return Date.now() < Number(value);
  } catch {
    return false;
  }
}

function recordDismissal(raceSlug: string): void {
  try {
    localStorage.setItem(
      getStorageKey(raceSlug),
      String(Date.now() + DISMISS_TTL_MS),
    );
  } catch {
    // ignore
  }
}

export function useUpcomingPredictionBannerDismissal(raceSlug?: string | null) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!raceSlug) {
      setDismissed(false);
      return;
    }
    setDismissed(isDismissed(raceSlug));
  }, [raceSlug]);

  const dismiss = useMemo(
    () =>
      raceSlug
        ? () => {
            recordDismissal(raceSlug);
            setDismissed(true);
          }
        : () => {
            setDismissed(true);
          },
    [raceSlug],
  );

  return { dismissed, dismiss };
}
