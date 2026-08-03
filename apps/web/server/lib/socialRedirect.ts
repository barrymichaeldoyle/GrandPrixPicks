/**
 * Short entry points for links posted off-site.
 *
 * Each one keeps the posted URL readable while still arriving with acquisition
 * attribution attached, so a visit from a Reddit comment is distinguishable
 * from organic search in analytics.
 *
 * The campaign strings live here rather than in the route files because more
 * than one path can point at the same campaign: `/r` and `/reddit` are two
 * spellings of one link, and if they drifted apart the traffic would land on
 * two different `utm_campaign` values and neither number would be true.
 */
export const REDDIT_COMMUNITY_CAMPAIGN =
  '/?utm_source=reddit&utm_medium=social&utm_campaign=community';

/**
 * 302, not 301: these are marketing entry points, and a permanent redirect
 * would be cached by browsers so hard that changing a campaign later could not
 * reach people who had already followed the link.
 */
export function socialRedirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      'cache-control': 'public, max-age=3600',
    },
  });
}
