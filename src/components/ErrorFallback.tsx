import * as Sentry from '@sentry/tanstackstart-react';
import { Link, useRouter } from '@tanstack/react-router';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from './Button';

interface ErrorFallbackProps {
  error: unknown;
  reset?: () => void;
}

function getErrorObject(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Server Error')) {
    return 'Something went wrong while loading data. This has been reported automatically.';
  }
  if (message.includes('Network')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  return 'An unexpected error occurred. This has been reported automatically.';
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const router = useRouter();
  const errorObj = getErrorObject(error);

  useEffect(() => {
    Sentry.captureException(errorObj, {
      tags: {
        location:
          typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        component: 'ErrorFallback',
      },
    });
  }, [errorObj]);

  const handleRetry = () => {
    if (reset) {
      reset();
    } else {
      router.invalidate();
    }
  };

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error-muted">
          <AlertTriangle className="h-8 w-8 text-error" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-text">
          Oops! Something went wrong
        </h1>

        <p className="mb-8 text-text-muted">{getErrorMessage(error)}</p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleRetry} variant="primary" size="sm">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-2 font-semibold text-text transition-colors hover:bg-surface-muted"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>

        {import.meta.env.DEV && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-text-muted hover:text-text">
              Error details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-surface-muted p-4 text-xs text-error">
              {errorObj.stack || errorObj.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
