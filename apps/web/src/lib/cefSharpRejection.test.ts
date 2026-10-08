import type { ErrorEvent } from '@sentry/tanstackstart-react';
import { describe, expect, it } from 'vitest';

import { isCefSharpBridgeRejection } from './cefSharpRejection';

function rejection(
  value = 'Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4',
): Pick<ErrorEvent, 'exception'> {
  return {
    exception: {
      values: [
        {
          type: 'UnhandledRejection',
          value,
          mechanism: {
            type: 'auto.browser.global_handlers.onunhandledrejection',
            handled: false,
          },
        },
      ],
    },
  };
}

describe('isCefSharpBridgeRejection', () => {
  it('recognizes the production update rejection', () => {
    expect(isCefSharpBridgeRejection(rejection())).toBe(true);
  });

  it('recognizes the bridge signature with other ids and methods', () => {
    expect(
      isCefSharpBridgeRejection(
        rejection(
          'Object Not Found Matching Id:12, MethodName:simulateEvent, ParamCount:0',
        ),
      ),
    ).toBe(true);
  });

  it.each([
    'Object Not Found Matching Id:3',
    'Object Not Found Matching Id:3, MethodName:update',
    'Object Not Found Matching Id:3, MethodName:update, ParamCount:four',
    'Failed to update: Object Not Found Matching Id:3, MethodName:update, ParamCount:4',
    'Object Not Found Matching Id:3, MethodName:update, ParamCount:4; application failed',
    'Non-Error promise rejection captured with value: Not authenticated',
  ])('keeps other rejection messages: %s', (value) => {
    expect(isCefSharpBridgeRejection(rejection(value))).toBe(false);
  });

  it('keeps errors with a stack trace even when the message matches', () => {
    const event = rejection();
    event.exception!.values![0].stacktrace = {
      frames: [
        { filename: 'https://grandprixpicks.com/assets/app.js', lineno: 1 },
      ],
    };
    expect(isCefSharpBridgeRejection(event)).toBe(false);
  });

  it('keeps errors captured by the application', () => {
    const event = rejection();
    event.exception!.values![0].mechanism = { type: 'generic', handled: true };
    expect(isCefSharpBridgeRejection(event)).toBe(false);
  });

  it('keeps Error objects and linked exceptions', () => {
    const event = rejection();
    event.exception!.values![0].type = 'Error';
    expect(isCefSharpBridgeRejection(event)).toBe(false);
    event.exception!.values![0].type = 'UnhandledRejection';
    event.exception!.values!.push(rejection().exception!.values![0]);
    expect(isCefSharpBridgeRejection(event)).toBe(false);
  });

  it('keeps events without exception details', () => {
    expect(isCefSharpBridgeRejection({})).toBe(false);
    expect(isCefSharpBridgeRejection({ exception: { values: [] } })).toBe(
      false,
    );
  });
});
