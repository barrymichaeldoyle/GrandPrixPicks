type NewsGridRow = { note?: string };

type NewsPenaltySource = {
  key?: string;
  newsKey?: string;
  headline?: string;
  newsHeadline?: string;
  startingGrid?: NewsGridRow[];
  newsStartingGrid?: NewsGridRow[];
};

/**
 * Whether this news item is about a grid penalty, or carries one on its grid.
 *
 * The scoring reminder ("Grid penalties don’t change qualifying results") is
 * only worth saying next to a penalty. A livery, a pit-lane start or a grid
 * that landed exactly where qualifying left it should not drag the policy in.
 */
export function newsMentionsGridPenalty(item: NewsPenaltySource): boolean {
  const key = item.key ?? item.newsKey ?? '';
  if (key.includes('grid-penalty')) {
    return true;
  }
  const headline = item.headline ?? item.newsHeadline ?? '';
  if (/grid penalty/i.test(headline)) {
    return true;
  }
  const grid = item.startingGrid ?? item.newsStartingGrid ?? [];
  return grid.some((entry) => /penalty/i.test(entry.note ?? ''));
}

export function newsListMentionsGridPenalty(
  items: readonly NewsPenaltySource[],
): boolean {
  return items.some(newsMentionsGridPenalty);
}
