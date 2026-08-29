import { useRouterState } from '@tanstack/react-router';

/**
 * True when this document was rendered for a signed-in viewer whose own data
 * the server could not read.
 *
 * This is the third way onto the sign-in curtain, and on a phone it is by far
 * the most common. `initialAuth` comes from the durable `__client_uat` cookie,
 * so the server knows perfectly well who the viewer is — but `fetchDashboardSsrData`
 * reads Convex with the `__session` JWT, which lives about a minute. A tab
 * resumed after lunch, or a cold load on a slow connection, arrives with that
 * token already expired, the SSR read returns null (by design, see `./ssr`),
 * and the server ships the dashboard's *skeleton*.
 *
 * Nothing about that is a handoff in the sign-in sense, so none of the other
 * signals fire, and the page assembles in the open: skeleton, then a lazy chunk
 * swap, then a 22-driver picker, then — for a player who had already picked —
 * a collapse to the short summary card. That is the flashing and the shrinking
 * card, and it repeats on every cold load rather than only at sign-in.
 *
 * Reading it from the matched route rather than from the root loader is what
 * makes it free of a second server call: the home route has already awaited
 * this exact question, and the answer is sitting in its loader data by the time
 * the root renders. It is therefore true on the server too, so the curtain is
 * in the HTML rather than applied to it.
 *
 * The route sets the flag rather than this inferring it from a null payload,
 * because that payload is also null on every client navigation, where nothing
 * is wrong and a curtain would be an interruption. See the home loader.
 */
export function useSsrViewerDataMissing(): boolean {
  return useRouterState({
    select: (state) =>
      state.matches.some((match) => {
        if (match.routeId !== '/') {
          return false;
        }
        const data = match.loaderData as
          | { ssrViewerDataMissing?: boolean }
          | undefined;
        return data?.ssrViewerDataMissing === true;
      }),
  });
}
