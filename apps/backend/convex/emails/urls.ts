function withCampaign(url: URL, campaign: string) {
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

export function buildRaceEmailUrl(params: {
  appUrl: string;
  raceSlug: string;
  campaign: string;
}) {
  return withCampaign(
    new URL(`/races/${params.raceSlug}`, params.appUrl),
    params.campaign,
  );
}

/**
 * Where a "how did I do" email lands.
 *
 * Results emails used to open the race page, which answers a different
 * question: it shows what the session did, and buries where that left *you*
 * under the picks UI for a weekend you have already played. The score only
 * means something next to everyone else's, so send the reader to the weekend
 * standings for that round instead, scoped with `raceId` so it reads the round
 * the email is about rather than whichever weekend is current by the time the
 * mail is opened.
 *
 * The race page keeps the traffic it is actually right for: every remaining
 * "go and pick" CTA still points there (see `buildRaceEmailUrl`).
 */
export function buildWeekendLeaderboardEmailUrl(params: {
  appUrl: string;
  raceId: string;
  campaign: string;
}) {
  const url = new URL('/leaderboard', params.appUrl);
  url.searchParams.set('time', 'weekend');
  url.searchParams.set('raceId', params.raceId);
  return withCampaign(url, params.campaign);
}
