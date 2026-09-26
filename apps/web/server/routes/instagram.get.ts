import { currentWeekendRedirect } from '../lib/currentWeekendLanding';
import { INSTAGRAM_PROFILE_CAMPAIGN } from '../lib/socialRedirect';

// The spelled-out form of `/ig`, so either works wherever the link is pasted.
export default function handler() {
  return currentWeekendRedirect(INSTAGRAM_PROFILE_CAMPAIGN);
}
