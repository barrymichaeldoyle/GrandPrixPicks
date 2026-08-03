import {
  REDDIT_COMMUNITY_CAMPAIGN,
  socialRedirect,
} from '../lib/socialRedirect';

// Keep links posted to Reddit readable while preserving acquisition
// attribution. `/r` is the short form of this same link.
export default function handler() {
  return socialRedirect(REDDIT_COMMUNITY_CAMPAIGN);
}
