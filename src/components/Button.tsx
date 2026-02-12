import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { Tooltip } from './Tooltip';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors';

const variants = {
  primary:
    'border border-transparent bg-button-accent hover:bg-button-accent-hover text-white disabled:bg-surface-muted disabled:text-text-muted disabled:cursor-not-allowed',
  danger:
    'border border-transparent bg-error hover:bg-error/90 text-white disabled:opacity-50 disabled:cursor-not-allowed',
  saved:
    'border border-success/30 bg-success-muted text-success cursor-default',
  loading:
    'border border-transparent bg-button-accent text-white opacity-90 cursor-wait',
  secondary:
    'border border-border bg-surface hover:bg-surface-muted text-text disabled:opacity-50 disabled:cursor-not-allowed',
  tab: 'font-medium text-text-muted hover:bg-surface-muted hover:text-text disabled:bg-transparent disabled:text-text-muted/50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted/50',
} as const;

const sizes = {
  sm: 'px-6 text-base py-2',
  md: 'px-6 py-3 text-base',
  tab: 'rounded-md px-3 py-2 text-sm',
} as const;

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** When true, renders saved (success) state and disables the button. */
  saved?: boolean;
  /** Tooltip shown on hover (works even when disabled) */
  tooltip?: string;
  /** For variant="tab": selected/active state */
  active?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      saved = false,
      disabled,
      className = '',
      children,
      type = 'button',
      tooltip,
      active,
      ...rest
    },
    ref,
  ) => {
    const effectiveVariant = saved ? 'saved' : loading ? 'loading' : variant;
    const isDisabled = disabled || loading || saved;

    const activeStyles =
      effectiveVariant === 'tab' && active
        ? 'bg-accent text-white hover:bg-accent hover:text-white cursor-default pointer-events-none'
        : '';

    const resolvedClassName = [
      base,
      sizes[size],
      variants[effectiveVariant],
      activeStyles,
      tooltip ? undefined : className,
    ]
      .filter(Boolean)
      .join(' ');

    const button = (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-selected={effectiveVariant === 'tab' ? active : undefined}
        role={effectiveVariant === 'tab' ? 'tab' : undefined}
        className={
          tooltip ? `${resolvedClassName} w-full`.trim() : resolvedClassName
        }
        {...rest}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="shrink-0 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );

    if (tooltip) {
      return (
        <Tooltip content={tooltip} triggerClassName={className || undefined}>
          <span className="block w-full">{button}</span>
        </Tooltip>
      );
    }

    return button;
  },
);

Button.displayName = 'Button';

export { Button };

/** Class names for styling a link as a primary button (e.g. Link from react-router). */
export function primaryButtonStyles(size: ButtonSize = 'md'): string {
  return [
    base,
    sizes[size],
    'bg-button-accent hover:bg-button-accent-hover text-white',
  ].join(' ');
}
