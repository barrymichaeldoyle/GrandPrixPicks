import {
  BCI_CONFERENCE_CAMPAIGN,
  socialRedirect,
  withUtmContent,
} from '../lib/socialRedirect';

type RouteEvent = {
  req: Request;
};

/**
 * The link we hand out as a conference sponsor: on slides, on the badge, and
 * from the sponsor app on bci.grandprixpicks.com. It lands on the ordinary
 * landing page, attributed, so sponsorship traffic is separable from organic.
 *
 * A `utm_content` on the incoming link is carried through, which is how the
 * placements stay distinguishable: `/bci?utm_content=app` for links inside the
 * sponsor app, `/bci?utm_content=badge` for anything printed.
 */
export default function handler(event: RouteEvent) {
  return socialRedirect(withUtmContent(BCI_CONFERENCE_CAMPAIGN, event.req.url));
}
