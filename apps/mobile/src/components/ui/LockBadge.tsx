import type { LockStatusViewModel } from '@grandprixpicks/shared/picks';

import { View } from '../../tw';
import { Numeral } from './Numeral';

type LockBadgeProps = {
  lockStatus: LockStatusViewModel;
};

export function LockBadge({ lockStatus }: LockBadgeProps) {
  const isWarning = lockStatus.badgeTone === 'warning';
  const isLocked = lockStatus.isLocked;
  const tone = isLocked ? 'muted' : isWarning ? 'warning' : 'gain';

  return (
    <View
      className={`self-start rounded-full border px-2.5 py-[3px] ${
        isLocked
          ? 'border-border-strong bg-surface-muted'
          : isWarning
            ? 'border-warning bg-warning-muted'
            : 'border-success bg-success-muted'
      }`}
    >
      <Numeral tone={tone} variant="small">
        {lockStatus.label}
      </Numeral>
    </View>
  );
}
