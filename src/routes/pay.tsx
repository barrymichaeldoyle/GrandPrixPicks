import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { canonicalMeta } from '../lib/site';

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set: (environment: 'sandbox' | 'production') => void;
      };
      Initialize: (options: {
        token: string;
        eventCallback?: (event: { name?: string }) => void;
        checkout?: {
          settings?: {
            displayMode?: 'overlay' | 'inline';
            theme?: 'light' | 'dark';
            locale?: string;
          };
        };
      }) => void;
      Checkout?: {
        open: (options: { transactionId: string }) => void;
      };
    };
  }
}

export const Route = createFileRoute('/pay')({
  component: PayPage,
  head: () => {
    const canonical = canonicalMeta('/pay');
    return {
      meta: [
        { title: 'Checkout | Grand Prix Picks' },
        { name: 'robots', content: 'noindex' },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
const SCRIPT_ID = 'paddle-js-sdk';
const DEFAULT_SEASON = 2026;
const paddleClientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as
  | string
  | undefined;

function getPaddleEnvironment(): 'sandbox' | 'production' {
  const explicit = (import.meta.env.VITE_PADDLE_ENV as string | undefined)
    ?.toLowerCase()
    .trim();

  if (explicit === 'production') {
    return 'production';
  }

  if (explicit === 'sandbox') {
    return 'sandbox';
  }

  return import.meta.env.DEV ? 'sandbox' : 'production';
}

function loadPaddleJs(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.Paddle) {
    return Promise.resolve();
  }

  const existing = document.getElementById(
    SCRIPT_ID,
  ) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Could not load Paddle.js')),
        {
          once: true,
        },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = PADDLE_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Paddle.js'));
    document.head.appendChild(script);
  });
}

function PayPage() {
  const [statusMessage, setStatusMessage] = useState(
    'Opening secure checkout...',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const openedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;

    async function openCheckout() {
      const txn = new URLSearchParams(window.location.search).get('_ptxn');

      if (!txn) {
        setErrorMessage('Missing Paddle transaction ID in URL (_ptxn).');
        setStatusMessage('Checkout could not be opened.');
        return;
      }

      if (!paddleClientToken) {
        setErrorMessage(
          'Missing VITE_PADDLE_CLIENT_TOKEN environment variable.',
        );
        setStatusMessage('Checkout could not be opened.');
        return;
      }

      try {
        await loadPaddleJs();

        if (!window.Paddle) {
          throw new Error('Paddle.js is not available on window');
        }

        const environment = getPaddleEnvironment();
        window.Paddle.Environment?.set(environment);

        window.Paddle.Initialize({
          token: paddleClientToken,
          eventCallback: (event) => {
            if (event.name === 'checkout.loaded') {
              setStatusMessage('Checkout ready.');
            }

            if (event.name === 'checkout.completed') {
              completedRef.current = true;
              setStatusMessage('Payment complete. Redirecting...');
              window.location.assign(
                `/settings?purchase=success&season=${DEFAULT_SEASON}`,
              );
            }

            if (event.name === 'checkout.closed' && !completedRef.current) {
              window.location.assign('/pricing?checkout=cancelled');
            }
          },
          checkout: {
            settings: {
              displayMode: 'overlay',
              theme: 'light',
            },
          },
        });

        if (!window.Paddle.Checkout) {
          throw new Error('Paddle.Checkout API is unavailable');
        }

        window.Paddle.Checkout.open({
          transactionId: txn,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unexpected checkout error';
        setErrorMessage(message);
        setStatusMessage('Checkout could not be opened.');
      }
    }

    void openCheckout();
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center p-4">
      <div className="w-full rounded-xl border border-border bg-surface p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-text">
          Season Pass Checkout
        </h1>
        <p className="text-sm text-text-muted">{statusMessage}</p>
        {errorMessage ? (
          <p className="mt-3 text-sm text-error">
            {errorMessage} If this keeps happening, go back to pricing and try
            again.
          </p>
        ) : null}
        <p className="mt-4 text-xs text-text-muted">
          <Link to="/pricing" className="text-accent hover:underline">
            Back to pricing
          </Link>
        </p>
      </div>
    </div>
  );
}
