/**
 * Only same-origin relative paths may be used as a link target. Without this a
 * value like `//evil.com` (or `/\evil.com`, or an absolute URL) renders a
 * trusted-domain link that navigates off-site on click / middle-click / native
 * href follow (open redirect).
 *
 * Applies to anything that becomes an href: a `?from=` search param, an
 * announcement banner CTA, a notification row.
 */
export function sanitizeInternalPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  // Must be a path rooted at "/", but not protocol-relative ("//") or a
  // backslash-smuggled variant ("/\") that browsers treat as a host.
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return undefined;
  }
  // Reject control characters (incl. tab/newline/space) that browsers may
  // strip to expose a leading "//".
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) <= 0x20) {
      return undefined;
    }
  }
  return value;
}
