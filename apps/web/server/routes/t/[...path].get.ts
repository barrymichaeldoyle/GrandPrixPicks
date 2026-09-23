import { resolveTrmnlLanding } from '../../../src/lib/trmnl/payload';
import { socialRedirect } from '../../lib/socialRedirect';

type RouteEvent = {
  req: Request;
};

/**
 * The TRMNL plugin's QR code: `/t/<race>/<phase>`, expanded to the weekend's
 * write-up or race page with PostHog attribution. Short on purpose, because a
 * QR code grows with its payload and the screen has little room for one.
 */
export default function handler(event: RouteEvent) {
  return socialRedirect(resolveTrmnlLanding(new URL(event.req.url).pathname));
}
