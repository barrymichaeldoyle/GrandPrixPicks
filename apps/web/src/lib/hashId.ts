/**
 * The element id a URL hash names, decoded. Empty for no hash or one that is
 * not valid percent-encoding.
 *
 * `decodeURIComponent` throws on input like `#%` or a truncated `%E0`, which a
 * mangled share link produces. Thrown from a mount effect, that took the whole
 * page to the error screen; a hash nobody can resolve should just do nothing.
 */
export function hashId(hash: string): string {
  const raw = hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return '';
  }
}
