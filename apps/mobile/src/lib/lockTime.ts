import {
  formatLockCountdown,
  getLockStatusViewModel as getSharedLockStatusViewModel,
} from "@grandprixpicks/shared/picks";

export function formatCountdown(msRemaining: number) {
  return formatLockCountdown(msRemaining);
}

export function getLockStatusViewModel(msRemaining: number, nowMs: number) {
  return getSharedLockStatusViewModel({
    blinkEverySecond: true,
    msRemaining,
    nowMs,
  });
}
