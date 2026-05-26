import * as Sentry from '@sentry/tanstackstart-react';

type ServerErrorContext = {
  name: string;
  tags?: Record<string, string | number | boolean | null | undefined>;
  extra?: Record<string, unknown>;
};

export function captureServerException(
  error: unknown,
  context: ServerErrorContext,
) {
  Sentry.captureException(error, {
    tags: {
      runtime: 'server',
      operation: context.name,
      ...context.tags,
    },
    extra: context.extra,
  });
}

export function startServerSpan<T>(
  context: ServerErrorContext,
  callback: () => T,
): T {
  return Sentry.startSpan(
    {
      name: context.name,
      op: 'server.function',
      attributes: {
        'app.runtime': 'server',
        ...context.tags,
      },
    },
    callback,
  );
}
