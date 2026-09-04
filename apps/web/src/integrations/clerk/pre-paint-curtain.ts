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
 * hides the shell and draws the loader, with no script of ours having had to
 * load first.
 *
 * The curtain is drawn entirely in CSS, off pseudo-elements on `<html>`, and
 * that is a deliberate constraint rather than a flourish:
 *
 * - **Nothing to clean up.** It exists exactly while the attribute is set, so
 *   the moment `AuthCurtainHost` clears the attribute the curtain is gone. A
 *   real element would have to be removed by whoever put it there, and the
 *   component that clears the attribute is not that owner.
 * - **Nothing for React to hydrate.** TanStack Start hydrates the whole
 *   document, so a node injected into `<body>` before hydration sits inside the
 *   hydration container and mismatches — on precisely the load this exists for.
 * - **Nothing for a crawler to read.** Signed-out HTML must not ship "Signing
 *   you in", and `display:none` is not a reliable guarantee against search
 *   snippets. There is no copy here at all: this covers a sub-second gap and
 *   hands over to `SigningInCurtain`, which is a real live region with a label.
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
 * Where this script publishes the cookie name it was given, for the rest of the
 * app to read synchronously.
 *
 * Resolving the name means hashing the publishable key, which is async and so
 * unavailable to a module-scope or event-handler read. The server has already
 * done that work to build this script, so it hands the answer over here rather
 * than making every browser-side reader guess at it — see
 * `hasClerkSessionCookie`, which got the guess wrong.
 */
export const SESSION_COOKIE_NAME_GLOBAL = '__gppClerkSessionCookieName';

/**
 * Set by the script when its own ceiling fires, i.e. React never got far enough
 * to take the curtain down itself.
 *
 * That is a strictly worse failure than the one `AuthCurtainHost` reports — a
 * chunk that never loaded, a parse error, a browser that never ran the app —
 * and the script cannot report it, because reporting needs the very bundle that
 * did not arrive. So it leaves a mark instead, and whichever part of the app
 * does eventually boot sends it. If nothing ever boots there is nobody to tell,
 * which is the honest limit of a report written in the page it is reporting on.
 */
export const PRE_PAINT_TIMEOUT_GLOBAL = '__gppPrePaintCurtainTimedOut';

/**
 * Applies the same cookie rule as `isClerkSessionPresent` on the server: this
 * instance's suffixed cookie decides, and the unsuffixed pre-suffix name counts
 * only in its absence. A browser that once visited another Clerk instance keeps
 * that instance's cookie forever, and reading it as a session here would hide
 * the landing page from a genuinely signed-out visitor for eight seconds.
 */
export function prePaintCurtainScript(sessionCookieName: string | null) {
  return `(function(){try{var n=${JSON.stringify(sessionCookieName)};window.${SESSION_COOKIE_NAME_GLOBAL}=n;var s=null,p=null,c=document.cookie?document.cookie.split(';'):[];for(var i=0;i<c.length;i++){var e=c[i].indexOf('=');if(e<0)continue;var k=c[i].slice(0,e).trim(),v=c[i].slice(e+1).trim();if(n&&k===n)s=v;else if(k==='__client_uat')p=v;}var u=s!==null?s:p;if(!u||u==='0')return;var d=document.documentElement;d.setAttribute('${AUTH_HANDOFF_ATTRIBUTE}','');setTimeout(function(){if(!d.hasAttribute('${AUTH_HANDOFF_ATTRIBUTE}'))return;d.removeAttribute('${AUTH_HANDOFF_ATTRIBUTE}');window.${PRE_PAINT_TIMEOUT_GLOBAL}=1},${PRE_PAINT_CURTAIN_TIMEOUT_MS})}catch(_){}})()`;
}

/**
 * Deliberately inline and unlayered rather than part of `styles.css`.
 *
 * Inline because it has to be in force for the very first paint, and unlayered
 * because it must beat every utility on the shell — including the `invisible`
 * that `AppShell` applies for React's own curtain, which is the same intent
 * expressed one lifecycle later.
 *
 * The token fallbacks are not decoration: this rule is parsed before the app
 * stylesheet that defines `--page` and `--accent`, and a curtain that paints
 * transparent is not a curtain. Sized and coloured to match `SigningInCurtain`
 * so the handoff between the two loaders is invisible; change one, change both.
 */
export const PRE_PAINT_CURTAIN_CSS = `
html[${AUTH_HANDOFF_ATTRIBUTE}] [${APP_SHELL_ATTRIBUTE}]{visibility:hidden}
html[${AUTH_HANDOFF_ATTRIBUTE}]::before{content:'';position:fixed;inset:0;z-index:150;background:var(--page,#101113)}
html[${AUTH_HANDOFF_ATTRIBUTE}]::after{content:'';position:fixed;top:50%;left:50%;z-index:151;box-sizing:border-box;width:2rem;height:2rem;margin:-1rem 0 0 -1rem;border-radius:9999px;border:2px solid rgba(255,255,255,.15);border-top-color:var(--accent,#d4ff3f);animation:gpp-pre-paint-spin .8s linear infinite}
@keyframes gpp-pre-paint-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){html[${AUTH_HANDOFF_ATTRIBUTE}]::after{animation:none}}
`.trim();
