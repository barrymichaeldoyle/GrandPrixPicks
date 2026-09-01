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
 * exists. So the reconciliation runs as a blocking script at the top of
 * `<body>`: it compares what the server just rendered against the cookie the
 * browser holds *now*, and when they disagree it marks the document and injects
 * the same loader `AuthCurtainHost` would, with no script of ours having had
 * to load first.
 *
 * The curtain markup is injected here, not server-rendered. Crawlers and
 * signed-out SSR must not ship "Signing you in" in the HTML — `display:none`
 * is not enough for search snippets — so the loader only exists in the DOM when
 * this script creates it for a live session cookie the server missed. The
 * label is assembled at runtime inside the script so the signed-out document
 * source never carries that phrase as plain text.
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
  return `(function(){try{var n=${JSON.stringify(sessionCookieName)},s=null,p=null,c=document.cookie?document.cookie.split(';'):[];for(var i=0;i<c.length;i++){var e=c[i].indexOf('=');if(e<0)continue;var k=c[i].slice(0,e).trim(),v=c[i].slice(e+1).trim();if(n&&k===n)s=v;else if(k==='__client_uat')p=v;}var u=s!==null?s:p;if(!u||u==='0')return;var d=document.documentElement;d.setAttribute('${AUTH_HANDOFF_ATTRIBUTE}','');function mount(){var existing=document.getElementById('gpp-pre-paint-curtain');if(existing)return;var el=document.createElement('div');el.id='gpp-pre-paint-curtain';el.className='fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-page';el.setAttribute('role','status');el.setAttribute('aria-live','polite');var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','h-8 w-8 animate-spin text-accent motion-reduce:animate-none');svg.setAttribute('width','24');svg.setAttribute('height','24');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');var path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M21 12a9 9 0 1 1-6.219-8.56');svg.appendChild(path);var label=document.createElement('p');label.className='text-xs font-semibold tracking-label text-text-muted uppercase';label.textContent=String.fromCharCode(83,105,103,110,105,110,103,32,121,111,117,32,105,110);el.appendChild(svg);el.appendChild(label);document.body.insertBefore(el,document.body.firstChild)}mount();setTimeout(function(){d.removeAttribute('${AUTH_HANDOFF_ATTRIBUTE}');var curtain=document.getElementById('gpp-pre-paint-curtain');if(curtain)curtain.remove()},${PRE_PAINT_CURTAIN_TIMEOUT_MS})}catch(_){}})()`;
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
`.trim();
