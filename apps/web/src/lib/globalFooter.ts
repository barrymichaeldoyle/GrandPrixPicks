/**
 * Who owns the small print on a given page.
 *
 * Two footers exist: the full grouped one at the bottom of the shell, and the
 * condensed run of links in the signed-in right rail. They carry the same
 * destinations, so exactly one of them should ever be on screen.
 *
 * The rail version is the exception, not the rule. It exists because signed-in
 * Home is a dashboard whose rail already ends in a natural column of links, and
 * hanging the full footer under an infinite feed puts the legal links somewhere
 * nobody scrolls to. Every other page ends, so every other page keeps the real
 * footer and the rail stays quiet.
 *
 * Both footers read this one function rather than each testing the route
 * themselves, because the failure mode of them disagreeing is silent: either
 * two footers stacked on the same page, or none at all.
 */
export function showsGlobalFooter(
  pathname: string,
  isSignedIn: boolean,
): boolean {
  return !(isSignedIn && pathname === '/');
}
