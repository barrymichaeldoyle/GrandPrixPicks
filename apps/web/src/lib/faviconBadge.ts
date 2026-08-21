import { colors } from '@grandprixpicks/shared/tokens';

/**
 * The app mark, as SVG shapes, kept in step with `public/favicon.svg`.
 *
 * The badged icon has to be the *same* mark with a dot on it, not a lookalike
 * redrawn from memory, so this is a copy of the file's contents rather than an
 * approximation. `faviconBadge.test.ts` reads the real file and fails if the
 * two ever drift apart, which is the only thing keeping a copy honest.
 *
 * It is inlined rather than fetched because the badge has to be able to appear
 * the instant the unread count arrives, and a fetch + canvas round trip to
 * rasterise a 415-byte file is a lot of machinery for three rectangles.
 */
export const FAVICON_ARTWORK = `
  <rect width="32" height="32" rx="6" fill="#101113"/>
  <g fill="#D4FF3F" transform="translate(16 16) skewX(-12) translate(-16 -16)">
    <rect x="5" y="13" width="6" height="12"/>
    <rect x="14" y="7" width="6" height="18"/>
    <rect x="23" y="16" width="6" height="9"/>
  </g>
`;

/**
 * The unread dot: amber, like the header badge, because errors and alerts are
 * amber in this system and the icon should not be the one place they turn red.
 *
 * The dot is a dot and never a number. It renders at 16 CSS pixels in a tab
 * strip, where the whole mark is the size of a word's first letter, so a digit
 * inside a third of it is not a digit any more. The count lives in the title
 * and in the OS badge, both of which have room for it.
 *
 * The larger circle behind it is the page colour, punched out of the artwork so
 * the amber never sits directly against the chartreuse bars: at tab size those
 * two hues are close enough to merge into one shape.
 */
const BADGE = `
  <circle cx="23" cy="9" r="9" fill="#101113"/>
  <circle cx="23" cy="9" r="6.5" fill="${colors.error}"/>
`;

function svgDataUrl(body: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">` +
    `${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

/** The app icon with an unread dot, ready for a `<link rel="icon">` href. */
export const UNREAD_FAVICON_HREF = svgDataUrl(FAVICON_ARTWORK + BADGE);

/**
 * The app icon, unbadged, from the same source as the badged one.
 *
 * The indicator swaps this back in rather than removing its `<link>`, because a
 * removed icon link is not reliably re-read: browsers re-resolve the favicon
 * when an href changes, and may keep showing the last one they fetched when the
 * element simply disappears.
 */
export const PLAIN_FAVICON_HREF = svgDataUrl(FAVICON_ARTWORK);
