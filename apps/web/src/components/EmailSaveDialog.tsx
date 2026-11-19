import { X } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button/Button';
import { useModalDialog } from '@/hooks/useModalDialog';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  EmailCodeError,
  sendEmailCode,
  verifyEmailCode,
  whenClerkReady,
  type EmailCodeFlow,
} from '@/lib/emailCodeAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 6;

type Step = 'email' | 'code' | 'done';

/**
 * Save picks with an email and a code, in place of Clerk's sign-in modal
 * (`lib/emailCodeAuth.ts` has the why).
 *
 * Opened by `requestPickSaveSignIn` on the Clerk-free routes, which is every
 * page a signed-out visitor can make picks on. The draft is already marked for
 * submission before this opens, so a completed sign-in saves it exactly as the
 * modal's did (`PendingPickSubmitter`). Google, Apple and anything this form
 * cannot finish still go to the modal.
 */
export function EmailSaveDialog({
  open,
  onClose,
  onUseModal,
}: {
  open: boolean;
  onClose: () => void;
  /** Close this and open Clerk's modal instead. */
  onUseModal: () => void;
}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [flow, setFlow] = useState<EmailCodeFlow>('sign_up');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    needsModal: boolean;
  } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();

  function close() {
    if (busy || step === 'done') {
      return;
    }
    captureAnalyticsEvent('email_save_closed', { step });
    setStep('email');
    setCode('');
    setError(null);
    onClose();
  }

  const dialogRef = useModalDialog<HTMLDivElement>({
    open,
    onClose: close,
    initialFocusRef: step === 'code' ? codeRef : emailRef,
  });

  if (!open) {
    return null;
  }

  function fail(caught: unknown, where: Step) {
    const known = caught instanceof EmailCodeError;
    const message = known ? caught.message : 'That didn’t work. Try again.';
    setError({ message, needsModal: known && caught.needsModal });
    captureAnalyticsEvent('email_save_failed', {
      step: where,
      reason: message,
      needs_modal: known && caught.needsModal,
    });
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError({ message: 'Enter a valid email address.', needsModal: false });
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const clerk = await whenClerkReady();
      if (!clerk) {
        throw new EmailCodeError('Sign-in didn’t load. Try again.', true);
      }
      const started = await sendEmailCode(clerk, address);
      setFlow(started);
      setCode('');
      setStep('code');
      captureAnalyticsEvent('email_save_code_sent', { flow: started });
      window.requestAnimationFrame(() => codeRef.current?.focus());
    } catch (caught) {
      fail(caught, 'email');
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    if (value.length !== CODE_LENGTH || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const clerk = await whenClerkReady();
      if (!clerk) {
        throw new EmailCodeError('Sign-in didn’t load. Try again.', true);
      }
      await verifyEmailCode(clerk, flow, value);
      captureAnalyticsEvent('email_save_completed', { flow });
      // The page becomes the signed-in app from here (the overlay reports the
      // session), and the pending draft saves itself.
      setStep('done');
    } catch (caught) {
      fail(caught, 'code');
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function useModal() {
    captureAnalyticsEvent('email_save_other_way', { step });
    setStep('email');
    setError(null);
    onUseModal();
  }

  const inputClass =
    'mt-1.5 block min-h-11 w-full rounded-sm border border-border bg-page px-3 text-base text-text placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:opacity-60';

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-lg border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-4 sm:rounded-lg sm:p-6"
        data-testid="email-save-dialog"
      >
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-hover hover:text-text pointer-coarse:h-11 pointer-coarse:w-11"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <h2 id={titleId} className="pr-10 text-lg font-semibold text-text">
          Save your picks
        </h2>

        {step === 'email' ? (
          <form onSubmit={(event) => void sendCode(event)} noValidate>
            <label className="mt-4 block text-sm text-text-muted">
              Email
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                disabled={busy}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={inputClass}
              />
            </label>
            {/* Clerk's bot check mounts here for a new sign-up. */}
            <div id="clerk-captcha" className="mt-3 empty:hidden" />
            <ErrorLine id={errorId} error={error} onUseModal={useModal} />
            <Button
              type="submit"
              size="md"
              className="mt-4 w-full"
              loading={busy}
            >
              Email me a code
            </Button>
            <Button
              type="button"
              variant="text"
              size="md"
              className="mt-2 w-full"
              onClick={useModal}
              disabled={busy}
            >
              Use Google or Apple
            </Button>
          </form>
        ) : step === 'code' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verify(code);
            }}
            noValidate
          >
            <label className="mt-4 block text-sm text-text-muted">
              Enter the 6-digit code sent to{' '}
              <span className="break-all text-text">{email.trim()}</span>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={CODE_LENGTH}
                value={code}
                onChange={(event) => {
                  const digits = event.target.value
                    .replace(/\D/g, '')
                    .slice(0, CODE_LENGTH);
                  setCode(digits);
                  setError(null);
                  // A pasted or autofilled code is the whole code: no reason
                  // to make them press anything.
                  if (digits.length === CODE_LENGTH) {
                    void verify(digits);
                  }
                }}
                disabled={busy}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={`${inputClass} gpp-mono tracking-[0.4em]`}
              />
            </label>
            <ErrorLine id={errorId} error={error} onUseModal={useModal} />
            <Button
              type="submit"
              size="md"
              className="mt-4 w-full"
              loading={busy}
              disabled={code.length !== CODE_LENGTH}
            >
              Save picks
            </Button>
            <div className="mt-2 flex justify-between gap-2">
              <Button
                type="button"
                variant="text"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setStep('email');
                  setError(null);
                  window.requestAnimationFrame(() => emailRef.current?.focus());
                }}
              >
                Change email
              </Button>
              <Button
                type="button"
                variant="text"
                size="sm"
                disabled={busy}
                onClick={() => void sendCode()}
              >
                Send a new code
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-text-muted" role="status">
            Saving your picks
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ErrorLine({
  id,
  error,
  onUseModal,
}: {
  id: string;
  error: { message: string; needsModal: boolean } | null;
  onUseModal: () => void;
}) {
  if (!error) {
    return null;
  }
  return (
    <div id={id} role="alert" className="mt-3 text-sm text-error">
      {error.message}
      {error.needsModal ? (
        <>
          {' '}
          <button
            type="button"
            className="font-medium text-text underline underline-offset-4"
            onClick={onUseModal}
          >
            Continue in the sign-in window
          </button>
        </>
      ) : null}
    </div>
  );
}
