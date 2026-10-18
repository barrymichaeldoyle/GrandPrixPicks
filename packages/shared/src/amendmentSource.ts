/**
 * The FIA decision behind an official results amendment. The race page links
 * it beside the note, so it must be an https link on fia.com: an admin pastes
 * it, and players trust it because it sits next to our own wording.
 *
 * Returns the URL as typed (trimmed), or undefined when it is not one.
 */
// https, fia.com or a subdomain of it, no credentials or port, then the end
// or a path, query or fragment. The host part cannot contain "@" or "\", so
// `https://www.fia.com@evil.com` and backslash tricks fall through.
const FIA_URL = /^https:\/\/(?:[a-z0-9-]+\.)*fia\.com(?:[/?#]\S*)?$/i;

export function parseAmendmentSourceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return FIA_URL.test(trimmed) ? trimmed : undefined;
}
