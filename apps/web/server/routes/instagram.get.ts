import {
  INSTAGRAM_PROFILE_CAMPAIGN,
  socialRedirect,
} from '../lib/socialRedirect';

// The spelled-out form of `/ig`, so either works wherever the link is pasted.
export default function handler() {
  return socialRedirect(INSTAGRAM_PROFILE_CAMPAIGN);
}
