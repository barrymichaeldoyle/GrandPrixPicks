import type { LockBadgeTone } from '@grandprixpicks/shared/picks';

export { getLockStatusViewModel } from '@grandprixpicks/shared/picks';

export function getLockUrgencyBadgeClassName(tone: LockBadgeTone): string {
  if (tone === 'success') {
    return 'text-success bg-success-muted border-success/30';
  }
  return 'text-warning bg-warning-muted border-warning/30';
}
