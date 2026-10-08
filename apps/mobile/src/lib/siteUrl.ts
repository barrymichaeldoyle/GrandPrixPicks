const SITE_URL = 'https://grandprixpicks.com';

/**
 * A grandprixpicks.com page, marked for the app's in-app browser.
 *
 * `?app=1` makes the site drop its header, footer and banners and keep the
 * flag on every link it follows (web `isInAppView`). Those carry sign-in,
 * leagues and the Season Pass, which the app does not offer, and a route to
 * buying the pass outside the App Store is a review rejection.
 */
export function siteUrl(path: string): string {
  const url = new URL(path, SITE_URL);
  url.searchParams.set('app', '1');
  return url.toString();
}
