import type { ReactNode } from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';

import { useModalDialog } from '@/hooks/useModalDialog';

import { Button } from './Button/Button';

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
  // While it is working, the dialog stops answering Escape: closing mid-write
  // would leave the user unsure whether the thing they confirmed happened.
  const dialogRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    suspended: loading,
    initialFocusRef: confirmRef,
  });

  if (!open) {
    return null;
  }

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
        className="mx-4 w-full max-w-md rounded-lg border border-border bg-surface p-6"
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
