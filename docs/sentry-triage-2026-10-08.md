# Sentry triage — 8 October 2026

Checked unresolved issues for the detected Grand Prix Picks project with
fresh results over 2020-01-01–2026-10-09. The mobile checkout detects the
same project. One issue remains unresolved.

## 30: CefSharp bridge rejection

[GRAND-PRIX-PICKS-30](https://barry-michael-doyle.sentry.io/issues/7780845465/)
has one production event at 10:54:09 UTC on the Singapore predictions page,
release `8f2d8666d3a723e117de24e47d0404a268fbe56e`:

```text
Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4
```

The exception is an automatically captured, unhandled `UnhandledRejection`
with no stack trace. The message matches
[CefSharp's own bridge error](https://github.com/cefsharp/CefSharp/commit/2ead42338062ec60c9bfc8564b88fb4307dc7bc3),
raised when a bound object is missing from its JavaScript object repository.
The event does not identify the embedding application or prove bot traffic.

The installed Sentry core SDK, version 11.1.0, only filters this signature
when the method name is `simulateEvent`. It therefore misses `update`.
An [open upstream fix](https://github.com/getsentry/sentry-javascript/pull/24382)
addresses the same gap.

The web `beforeSend` hook now filters the complete bridge-message shape
for any word method name and numeric object ID/parameter count. It requires
a single, stackless `UnhandledRejection` captured by the browser's automatic
unhandled-rejection handler. Events with stacks, linked exceptions, ordinary
Error objects, manual capture mechanisms, or incomplete messages remain
reportable. No dependency upgrade or application behavior change is needed.

## Validation and disposition

- Web suite: 166 files and 1,311 tests passed, including 12 new regression
  tests covering the incident and preservation of other errors.
- Web typecheck, lint, formatting, and diff checks passed.
- The filter is local and has not been deployed. The issue remains open
  until the deployed filter can be verified.
