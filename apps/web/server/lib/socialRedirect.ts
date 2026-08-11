/**
 * Short entry points for links posted off-site.
 *
 * Each one keeps the posted URL readable while still arriving with acquisition
 * attribution attached, so a visit from a Reddit comment is distinguishable
 * from organic search in analytics.
 *
 * The campaign strings live here rather than in the route files because more
 * than one path can point at the same campaign: `/r` and `/reddit`, `/ig` and
 * `/instagram`, are each two spellings of one link. If they drifted apart the
 * traffic would land on two different `utm_campaign` values and neither number
 * would be true.
 */
export const REDDIT_COMMUNITY_CAMPAIGN =
  '/?utm_source=reddit&utm_medium=social&utm_campaign=community';

export const INSTAGRAM_PROFILE_CAMPAIGN =
  '/?utm_source=instagram&utm_medium=social&utm_campaign=profile';

/**
 * The conference sponsorship, which is not social traffic: it gets its own
 * medium so it never dilutes the social breakdown the other campaigns are
 * judged on. The year is part of the slug because a second year of the same
 * event should be a second line in analytics, not an invisible merge into
 * this one.
 *
 * Most of this traffic arrives from the sponsor app on
 * bci.grandprixpicks.com. That is a separate origin, so its visitors land here
 * as new anonymous people and these parameters are the only attribution the
 * hop carries: links pointing back from that app have to spell out the same
 * query themselves.
 */
export const BCI_CONFERENCE_CAMPAIGN =
  '/?utm_source=bci&utm_medium=sponsorship&utm_campaign=bci-conference-2026';

/**
 * `utm_content` values we are willing to repeat back in a redirect.
 *
 * The parameter arrives from a URL anyone can edit and ends up as a dimension
 * in analytics, so it is matched against a strict slug rather than escaped:
 * anything longer, upper-case, or punctuated is a typo or a probe, and letting
 * those through would spray one-off values across the breakdown until the
 * dimension is useless. Unrecognised values are dropped, not rejected, because
 * a mistyped placement should still deliver the visitor to the landing page.
 */
const UTM_CONTENT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/**
 * Carries a placement label from the incoming link onto the campaign URL, so
 * one campaign can tell its placements apart: a tap from inside the sponsor
 * app and a scan off a printed badge roll up to the same campaign total while
 * staying separable underneath it.
 */
export function withUtmContent(campaign: string, requestUrl: string) {
  const content = new URL(requestUrl).searchParams.get('utm_content');
  if (!content || !UTM_CONTENT_PATTERN.test(content)) {
    return campaign;
  }

  // Resolved against a throwaway base so the campaign's own query is parsed
  // rather than string-spliced, then handed back as the relative URL the
  // Location header wants.
  const target = new URL(campaign, 'https://grandprixpicks.invalid');
  target.searchParams.set('utm_content', content);
  return `${target.pathname}${target.search}`;
}

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
