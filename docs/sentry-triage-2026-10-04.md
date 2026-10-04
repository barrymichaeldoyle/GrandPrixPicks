# Sentry triage — 4 October 2026

## 2Y: inline syntax error, cause unconfirmed

[GRAND-PRIX-PICKS-2Y](https://barry-michael-doyle.sentry.io/issues/7770996758/)
remains unresolved. It contains two `SyntaxError: Unexpected token 'else'`
events from one Lenovo TB-X606X / Android 10 / Chrome Mobile WebView
151.0.7922 visit at 16:10:05 UTC on 3 October. Both report the Bahrain
predictions document at line 1, column 219, on release `2760de18`.
One event records a Yahoo search referrer. The host application is unknown.

Neither event supplies the failing JavaScript source, an application call
stack, breadcrumbs, or a replay. The trace contains only the error event,
so it does not establish whether the visitor could use the page.

The installed Sentry GlobalHandlers implementation creates a single initial
frame from the browser's error URL/line/column when the exception has no
parsed stack. It marks that frame `in_app: true`. That flag alone therefore
does not prove this was application code. The document source context added
by Sentry is HTML; it does not contain an `else` at the reported location.

### Verification

- Retrieved production HTML normally and with the incident's exact WebView
  user agent and Yahoo referrer. All 11 nonempty inline JavaScript scripts
  in each response parse successfully with `vm.Script`; JSON-LD parses too.
- Checked both document-relative and script-relative column 219. None of
  the retrieved inline scripts has the reported `else` at that position.
- The current production entry asset identifies release `12bbf024`. There
  is no diff from `2760de18` to the current checkout in `__root.tsx`,
  `pre-paint-curtain.ts`, or `router.tsx`. This checks the custom early
  scripts, but does not recover the incident's complete historical response.
- Opened the production page in the available signed-in desktop Chrome
  session and selected the Top 5 picks tab. It updated successfully and
  produced no console errors. This verifies hydration in Chrome, not in
  the incident's Android WebView.
- Web suite: 159 files and 1,244 tests passed, including the tests that
  execute the emitted pre-paint curtain script.
- Sentry Seer could not start an analysis because this Sentry project has
  no connected repository.

### Disposition

A script injected by the WebView host is a plausible explanation for the
document URL and source mismatch. It is an inference, not a confirmed root
cause. No application fix or error filter is justified by the available
evidence, and the issue has not been marked resolved.

To reproduce, identify the Android app containing the WebView and load the
same URL there. Capture the actual failing script and whether the page
remains interactive. If another event occurs, compare its source location,
browser/host context, and any breadcrumbs before assuming it has the same
cause. Preserve syntax-error reporting while this remains unconfirmed.
