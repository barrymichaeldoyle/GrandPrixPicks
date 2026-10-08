import type { ErrorEvent } from '@sentry/tanstackstart-react';

// CefSharp's JS-to-.NET bridge rejects with this string when a bound object
// disappears. The SDK's default filter only covers MethodName:simulateEvent,
// so update rejections still reach us (GRAND-PRIX-PICKS-30).
// https://github.com/getsentry/sentry-javascript/pull/24382
const bridgeRejection =
  /^(?:Non-Error promise rejection captured with value: )?Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+$/;

export function isCefSharpBridgeRejection(
  event: Pick<ErrorEvent, 'exception'>,
): boolean {
  const exceptions = event.exception?.values;
  if (exceptions?.length !== 1) {
    return false;
  }

  const exception = exceptions[0];
  return (
    exception.type === 'UnhandledRejection' &&
    exception.mechanism?.type ===
      'auto.browser.global_handlers.onunhandledrejection' &&
    exception.mechanism.handled === false &&
    !exception.stacktrace?.frames?.length &&
    bridgeRejection.test(exception.value ?? '')
  );
}
