const INSTAGRAM_PROFILE_CAMPAIGN =
  '/?utm_source=instagram&utm_medium=social&utm_campaign=profile';

// Keep the Instagram profile URL short while preserving acquisition attribution.
export default function handler() {
  return new Response(null, {
    status: 302,
    headers: {
      location: INSTAGRAM_PROFILE_CAMPAIGN,
      'cache-control': 'public, max-age=3600',
    },
  });
}
