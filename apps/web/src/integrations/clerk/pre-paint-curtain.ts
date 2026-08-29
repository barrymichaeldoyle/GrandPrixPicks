/**
 * The sign-in curtain, raised before the first paint instead of after
 * hydration.
 *
 * `AuthCurtainHost` can only react once React is running, which is far too late
 * on the arrival that needs it most. Signing in with Google or Apple leaves the
 * page entirely: the browser comes back on a fresh document, and if Clerk's
 * cookie is not on that request the server renders the *logged-out* landing
 * page — hero, countdown, driver picker, the lot. On a phone that HTML paints a
 * long beat before the app chunk has parsed, so the visitor watches the page
 * they just signed away from assemble itself, then vanish, then become the
 * dashboard.
 *
 * Nothing in React can prevent that, because the flash happens before React
 * exists. So the reconciliation runs as a blocking script in `<head>`: it
 * compares what the server just rendered against the cookie the browser holds
 * *now*, and when they disagree it marks the document. The accompanying CSS
 * hides the shell and shows the same loader `AuthCurtainHost` would, with no
 * script of ours having had to load first.
 *
 * Only ever raised for signed-out-render + live-session-cookie. That direction
 * matters:
 *
 * - It is the only direction that is a lie on screen. The reverse (server said
 *   signed in, browser has since signed out) resolves into the logged-out page
 *   the visitor asked for.
 * - It keeps sign-*out* off this path. Sign-out clears `__client_uat` before it
 *   returns, so there is no session cookie to find and no "Signing you in" over
 *   a visitor on their way out — which is the exact inversion the old
 *   `__clerk*`-parameter heuristic produced, since a sign-out redirect carries
 *   those parameters too.
 */

/** Marks the document as mid-handoff. Read by {@link PRE_PAINT_CURTAIN_CSS}. */
export const AUTH_HANDOFF_ATTRIBUTE = 'data-auth-handoff';

/** Hook for the shell the curtain hides. Set by `AppShell`. */
export const APP_SHELL_ATTRIBUTE = 'data-app-shell';

/**
 * Ceiling on the CSS-only curtain, matching `CURTAIN_TIMEOUT_MS`.
 *
 * React normally clears the attribute long before this — the moment its own
 * curtain resolves. This is for the case where it never gets the chance: a
 * failed chunk, a parse error, a browser that never runs the app. A visitor
 * must not be left staring at a loader over a page that is fully rendered
 * underneath it.
 */
const PRE_PAINT_CURTAIN_TIMEOUT_MS = 8_000;

/**
 * Applies the same cookie rule as `isClerkSessionPresent` on the server: this
 * instance's suffixed cookie decides, and the unsuffixed pre-suffix name counts
 * only in its absence. A browser that once visited another Clerk instance keeps
 * that instance's cookie forever, and reading it as a session here would hide
 * the landing page from a genuinely signed-out visitor for eight seconds.
 */
export function prePaintCurtainScript(sessionCookieName: string | null) {
  return `(function(){try{var n=${JSON.stringify(sessionCookieName)},s=null,p=null,c=document.cookie?document.cookie.split(';'):[];for(var i=0;i<c.length;i++){var e=c[i].indexOf('=');if(e<0)continue;var k=c[i].slice(0,e).trim(),v=c[i].slice(e+1).trim();if(n&&k===n)s=v;else if(k==='__client_uat')p=v;}var u=s!==null?s:p;if(!u||u==='0')return;var d=document.documentElement;d.setAttribute('${AUTH_HANDOFF_ATTRIBUTE}','');setTimeout(function(){d.removeAttribute('${AUTH_HANDOFF_ATTRIBUTE}')},${PRE_PAINT_CURTAIN_TIMEOUT_MS})}catch(_){}})()`;
}

/**
 * Deliberately inline and unlayered rather than part of `styles.css`.
 *
 * Inline because it has to be in force for the very first paint, and unlayered
 * because it must beat every utility on the shell — including the `invisible`
 * that `AppShell` applies for React's own curtain, which is the same intent
 * expressed one lifecycle later.
 */
export const PRE_PAINT_CURTAIN_CSS = `
html[${AUTH_HANDOFF_ATTRIBUTE}] [${APP_SHELL_ATTRIBUTE}]{visibility:hidden}
html:not([${AUTH_HANDOFF_ATTRIBUTE}]) #gpp-pre-paint-curtain{display:none}
`.trim();
