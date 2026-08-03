import {
  REDDIT_COMMUNITY_CAMPAIGN,
  socialRedirect,
} from '../lib/socialRedirect';

/**
 * The short form of `/reddit`, for posts and comments where a long link reads
 * like an advert. Both resolve to the identical campaign URL on purpose: two
 * spellings that attributed to different `utm_campaign` values would split
 * Reddit traffic across two lines in analytics and neither would be the truth.
 */
export default function handler() {
  return socialRedirect(REDDIT_COMMUNITY_CAMPAIGN);
}
