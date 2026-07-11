import * as StoreReview from 'expo-store-review';
import { useEffect, useRef } from 'react';

import { getStoredJson, setStoredJson } from '../lib/storage';

const REVIEW_KEY = 'review.requestedAfterScoredWeekend';

/**
 * Asks for an App Store rating the first time the user sees a fully scored
 * weekend — the emotional high point of the loop. Fires at most once per
 * install (iOS additionally rate-limits the actual dialog).
 */
export function useRequestReviewAfterScoredWeekend(
  weekendFullyScored: boolean,
) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!weekendFullyScored || attemptedRef.current) {
      return;
    }
    attemptedRef.current = true;
    void (async () => {
      if ((await getStoredJson<boolean>(REVIEW_KEY)) === true) {
        return;
      }
      await setStoredJson(REVIEW_KEY, true);
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    })();
  }, [weekendFullyScored]);
}
