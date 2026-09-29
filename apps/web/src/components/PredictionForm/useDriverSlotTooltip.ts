import { useEffect, useState } from 'react';

const DRIVER_SLOT_TOOLTIP = {
  /** Default stack: picks first, driver pool underneath. */
  narrowBelow: 'Select from the driver cards below',
  /** Landing `mobileActionFirst`: driver pool first, picks underneath. */
  narrowAbove: 'Select from the driver cards above',
  lg: 'Select from the driver cards to the right',
};

function driverSlotTooltipCopy({
  wide,
  driversAbove,
}: {
  wide: boolean;
  driversAbove: boolean;
}) {
  if (wide) {
    return DRIVER_SLOT_TOOLTIP.lg;
  }
  return driversAbove
    ? DRIVER_SLOT_TOOLTIP.narrowAbove
    : DRIVER_SLOT_TOOLTIP.narrowBelow;
}

/**
 * Tooltip for an empty slot. The direction matches the live layout: pool above
 * on the landing mobile stack, below on the race page, right on lg+.
 */
export function useDriverSlotTooltip(mobileActionFirst: boolean) {
  const [driverSlotTooltip, setDriverSlotTooltip] = useState(() =>
    driverSlotTooltipCopy({
      wide:
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 1024px)').matches,
      driversAbove: mobileActionFirst,
    }),
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    function handler() {
      setDriverSlotTooltip(
        driverSlotTooltipCopy({
          wide: mql.matches,
          driversAbove: mobileActionFirst,
        }),
      );
    }
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mobileActionFirst]);
  return driverSlotTooltip;
}
