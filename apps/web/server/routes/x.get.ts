import { X_PROFILE_CAMPAIGN, socialRedirect } from '../lib/socialRedirect';

// Keep the public profile URL short while preserving acquisition attribution.
export default function handler() {
  return socialRedirect(X_PROFILE_CAMPAIGN);
}
