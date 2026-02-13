import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button } from './Button';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  error = null,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null);

        if (focusable.length === 0) return;

        const currentIndex = focusable.indexOf(
          document.activeElement as HTMLElement,
        );

        if (e.shiftKey && currentIndex <= 0) {
          e.preventDefault();
          focusable[focusable.length - 1]?.focus();
        } else if (!e.shiftKey && currentIndex === focusable.length - 1) {
          e.preventDefault();
          focusable[0]?.focus();
        }
      }
    },
    [onClose, loading],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="mx-4 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl"
      >
        <h2
          id="confirm-dialog-title"
          className="mb-2 flex items-center gap-2 text-lg font-semibold text-text"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="mb-6 text-sm text-text-muted"
        >
          {description}
        </p>
        {error && (
          <p className="mb-4 text-sm text-error" aria-live="assertive">
            {error}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="min-w-[7rem]"
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            size="sm"
            onClick={onConfirm}
            loading={loading}
            className="min-w-[7rem]"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
