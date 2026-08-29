import { api } from '@convex-generated/api';

import { useQuery } from '@/integrations/convex/query';

/**
 * The current grid's teams in championship order.
 *
 * Every H2H list the server returns is sorted this way. A client that draws
 * placeholder rows before that data lands has to sort them the same way or the
 * teams visibly reshuffle when the real rows replace them, and last season's
 * order (`teamStandingsIndex`) is not the same order once a few rounds have
 * been scored.
 *
 * Call it from the row that can open such a list rather than from the list
 * itself: these read hooks are cache-backed and keep their subscription open,
 * so subscribing while the feed renders means the order is already in hand by
 * the time anything is tapped. Subscribing at open time would race the data it
 * exists to get ahead of.
 *
 * `undefined` until the first answer arrives; callers fall back to last
 * season's order, which is the best a cold client can do.
 */
export function useConstructorOrder(): string[] | undefined {
  return useQuery(api.f1Standings.getConstructorOrder, {});
}
