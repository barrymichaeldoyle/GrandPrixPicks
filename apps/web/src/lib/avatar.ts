const CLERK_IMAGE_ORIGIN = 'https://img.clerk.com/';

/**
 * Clerk serves avatars at their original resolution (uploaded photos can be
 * 1920px+) while we display them at 20–80px. Match Clerk's own UserButton
 * sizing: request width at 2x for retina, and let CSS `object-fit: cover`
 * handle the circular crop. Adding `height` + `fit=crop` over-zooms faces
 * compared to the header avatar. Non-Clerk URLs pass through untouched.
 */
export function sizedAvatarUrl(url: string, displayPx: number): string {
  if (!url.startsWith(CLERK_IMAGE_ORIGIN)) {
    return url;
  }
  const sized = new URL(url);
  sized.searchParams.set('width', String(displayPx * 2));
  return sized.toString();
}
