/** Drop-target ids shared by the pick list and the driver pool. */

export const DRIVER_POOL_DROPPABLE_ID = 'driver-pool';

export function emptySlotId(slotIndex: number) {
  return `empty-${slotIndex}`;
}

export function parseEmptySlotId(id: string): number | null {
  if (!id.startsWith('empty-')) {
    return null;
  }
  const n = parseInt(id.slice(6), 10);
  return Number.isNaN(n) ? null : n;
}
