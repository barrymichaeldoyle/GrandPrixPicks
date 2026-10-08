/** Machine-facing prefixes, matching `early-hints.ts`: never a rendered page. */
const NON_DOCUMENT_PREFIXES = ['/api/', '/og/', '/ingest/'];

/**
 * Where a page URL with a trailing slash should permanently redirect, or null.
 *
 * TanStack Router already strips the slash, but with a hardcoded 307, which
 * asks a search engine to keep `/how-to-play/` as a URL of its own and come
 * back to it. A 308 folds it into `/how-to-play` for good.
 *
 * A path starting `//` is left alone: stripped, `//example.com/` would become a
 * protocol-relative `Location` and send the visitor off-site.
 */
export function trailingSlashRedirect(url: URL): string | null {
  const { pathname, search } = url;
  if (
    pathname === '/' ||
    !pathname.endsWith('/') ||
    pathname.startsWith('//') ||
    NON_DOCUMENT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }
  return pathname.replace(/\/+$/, '') + search;
}
