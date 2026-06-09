const X_PROFILE_CAMPAIGN =
  '/?utm_source=x&utm_medium=social&utm_campaign=profile';

// Keep the public profile URL short while preserving acquisition attribution.
export default function handler() {
  return new Response(null, {
    status: 302,
    headers: {
      location: X_PROFILE_CAMPAIGN,
      'cache-control': 'public, max-age=3600',
    },
  });
}
