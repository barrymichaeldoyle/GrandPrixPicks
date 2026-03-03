import type { SessionType } from './sessions';

export type LockUrgency = 'open' | 'closing_soon' | 'locked';
export type LockBadgeTone = 'success' | 'warning';
export type LockStatusViewModel = {
  badgeTone: LockBadgeTone;
  isLocked: boolean;
  label: string;
  shouldPulse: boolean;
  urgency: LockUrgency;
};

const DEFAULT_CLOSING_SOON_MS = 60 * 60 * 1000;
const DEFAULT_PULSE_WINDOW_MS = 10 * 60 * 1000;

export function getLockUrgency(
  msRemaining: number,
  closingSoonWindowMs: number = DEFAULT_CLOSING_SOON_MS,
): LockUrgency {
  if (msRemaining <= 0) {
    return 'locked';
  }
  if (msRemaining <= closingSoonWindowMs) {
    return 'closing_soon';
  }
  return 'open';
}

export function getLockUrgencyLabel(urgency: LockUrgency): string {
  if (urgency === 'locked') {
    return 'Locked';
  }
  if (urgency === 'closing_soon') {
    return 'Closing Soon';
  }
  return 'Open';
}

export function getLockUrgencyBadgeTone(urgency: LockUrgency): LockBadgeTone {
  if (urgency === 'open') {
    return 'success';
  }
  return 'warning';
}

export function formatLockCountdown(msRemaining: number): string {
  if (msRemaining <= 0) {
    return 'Locked';
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes
      .toString()
      .padStart(2, '0')}m`;
  }

  return `${hours.toString().padStart(2, '0')}h ${minutes
    .toString()
    .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

export function shouldPulseLockBadge({
  msRemaining,
  nowMs = Date.now(),
  blinkEverySecond = false,
  closingSoonWindowMs = DEFAULT_CLOSING_SOON_MS,
  pulseWindowMs = DEFAULT_PULSE_WINDOW_MS,
}: {
  msRemaining: number;
  nowMs?: number;
  blinkEverySecond?: boolean;
  closingSoonWindowMs?: number;
  pulseWindowMs?: number;
}): boolean {
  const urgency = getLockUrgency(msRemaining, closingSoonWindowMs);
  if (urgency !== 'closing_soon') {
    return false;
  }
  if (msRemaining <= 0 || msRemaining > pulseWindowMs) {
    return false;
  }
  if (!blinkEverySecond) {
    return true;
  }
  return Math.floor(nowMs / 1000) % 2 === 0;
}

export function getLockStatusViewModel({
  msRemaining,
  nowMs = Date.now(),
  blinkEverySecond = false,
  closingSoonWindowMs = DEFAULT_CLOSING_SOON_MS,
  pulseWindowMs = DEFAULT_PULSE_WINDOW_MS,
}: {
  msRemaining: number;
  nowMs?: number;
  blinkEverySecond?: boolean;
  closingSoonWindowMs?: number;
  pulseWindowMs?: number;
}): LockStatusViewModel {
  const urgency = getLockUrgency(msRemaining, closingSoonWindowMs);
  return {
    badgeTone: getLockUrgencyBadgeTone(urgency),
    isLocked: urgency === 'locked',
    label: getLockUrgencyLabel(urgency),
    shouldPulse: shouldPulseLockBadge({
      blinkEverySecond,
      closingSoonWindowMs,
      msRemaining,
      nowMs,
      pulseWindowMs,
    }),
    urgency,
  };
}

export function getConnectedDraftStorageKey(
  raceSlug: string,
  session: SessionType,
): string {
  return `gpp:draft:connected:${raceSlug}:${session}`;
}

export function getLocalRaceDraftStorageKey(raceSlug: string): string {
  return `gpp:draft:local:${raceSlug}`;
}

export function getWebTop5DraftStorageKey(
  raceId: string,
  sessionType?: SessionType,
): string {
  return `gpp:web:top5:${raceId}:${sessionType ?? 'cascade'}`;
}

export function getWebH2HDraftStorageKey(
  raceId: string,
  sessionType?: SessionType,
): string {
  return `gpp:web:h2h:${raceId}:${sessionType ?? 'cascade'}`;
}
