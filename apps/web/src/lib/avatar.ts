const CLERK_IMAGE_ORIGIN = 'https://img.clerk.com/';

/**
 * Clerk serves avatars at their original resolution (uploaded photos can be
 * 1920px+) while we display them at 20–80px. Its image proxy accepts resize
 * params, so request a crop at 2x the displayed size for retina screens.
 * Non-Clerk URLs pass through untouched.
 */
export function sizedAvatarUrl(url: string, displayPx: number): string {
  if (!url.startsWith(CLERK_IMAGE_ORIGIN)) {
    return url;
  }
  const sized = new URL(url);
  sized.searchParams.set('width', String(displayPx * 2));
  sized.searchParams.set('height', String(displayPx * 2));
  sized.searchParams.set('fit', 'crop');
  sized.searchParams.set('quality', '80');
  return sized.toString();
}
