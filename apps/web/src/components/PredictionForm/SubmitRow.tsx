import { Check } from 'lucide-react';

import { Button } from '../Button/Button';

/** The default save button and its result line, when no parent replaces them. */
export function SubmitRow({
  showSaving,
  saved,
  disabled,
  isAuthenticated,
  isEdit,
  showSuccess,
  errorMessage,
  onSubmit,
}: {
  /** A save the player asked for is in flight (auto-saves stay quiet). */
  showSaving: boolean;
  /** The picks on screen already match the saved ones. */
  saved: boolean;
  disabled: boolean;
  isAuthenticated: boolean;
  isEdit: boolean;
  showSuccess: boolean;
  /** Set when the last save failed. */
  errorMessage: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-3 flex min-h-11 flex-wrap items-center justify-center gap-3 sm:mt-4 sm:gap-4">
      <Button
        variant="primary"
        size="md"
        className="w-100 max-w-full"
        loading={showSaving}
        saved={saved}
        disabled={disabled}
        onClick={onSubmit}
        data-testid="submit-prediction"
      >
        {saved ? (
          <>
            <Check size={20} className="shrink-0" />
            Saved
          </>
        ) : showSaving ? (
          'Saving...'
        ) : !isAuthenticated ? (
          'Sign in to save your picks'
        ) : isEdit ? (
          'Save Changes'
        ) : (
          'Save Predictions'
        )}
      </Button>

      {showSuccess && (
        <span className="text-sm text-success" aria-live="polite">
          Predictions saved. You can edit them until this session starts.
        </span>
      )}

      {errorMessage !== null && (
        <span
          className="text-sm text-error"
          data-testid="submit-error"
          aria-live="assertive"
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
