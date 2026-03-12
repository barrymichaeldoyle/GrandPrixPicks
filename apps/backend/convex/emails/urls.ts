export function buildRaceEmailUrl(params: {
  appUrl: string;
  raceSlug: string;
  campaign: string;
}) {
  const url = new URL(`/races/${params.raceSlug}`, params.appUrl);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', params.campaign);
  return url.toString();
}
