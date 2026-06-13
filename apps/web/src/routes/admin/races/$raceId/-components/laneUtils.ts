import type { Id } from '@convex-generated/dataModel';

export const LANE_ID_PREFIX = 'lane-';

export function parseLaneId(id: string): number | null {
  if (!id.startsWith(LANE_ID_PREFIX)) {
    return null;
  }
  const n = parseInt(id.slice(LANE_ID_PREFIX.length), 10);
  return Number.isNaN(n) ? null : n;
}

/** Nearest empty lane below `fromIndex`, falling back to the nearest one above. */
export function findNextEmptyLane(
  lanes: ReadonlyArray<Id<'drivers'> | null>,
  fromIndex: number,
): number | null {
  for (let i = fromIndex + 1; i < lanes.length; i++) {
    if (lanes[i] == null) {
      return i;
    }
  }
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (lanes[i] == null) {
      return i;
    }
  }
  return null;
}
