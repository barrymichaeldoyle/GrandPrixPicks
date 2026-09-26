import { currentWeekendRedirect } from '../lib/currentWeekendLanding';
import { INSTAGRAM_PROFILE_CAMPAIGN } from '../lib/socialRedirect';

// The Instagram bio link: always this weekend's write-up, attributed to the
// profile. `/instagram` is the long form of this same link.
export default function handler() {
  return currentWeekendRedirect(INSTAGRAM_PROFILE_CAMPAIGN);
}
