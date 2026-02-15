import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import type { ReactNode } from 'react';
import { Children, cloneElement, forwardRef, isValidElement } from 'react';

import { Tooltip } from './Tooltip';

const base =
  'inline-flex items-center justify-center gap-1 font-semibold leading-none rounded-lg transition-colors [&_svg]:shrink-0 [&_svg]:block';

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
  sm: 'px-2 text-base py-1',
  md: 'gap-1.5 px-4 py-3 text-base',
  tab: 'rounded-md px-3 py-2 text-sm',
} as const;

/** Icon size (px) per button size for consistent alignment. */
const iconSizes: Record<keyof typeof sizes, number> = {
  sm: 16,
  md: 20,
  tab: 14,
};

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

export type { ButtonSize };

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lucide icon shown before children; size is derived from button size. */
  icon?: LucideIcon;
  loading?: boolean;
  /** When true, renders saved (success) state and disables the button. */
  saved?: boolean;
  /** Tooltip shown on hover (works even when disabled) */
  tooltip?: string;
  /** For variant="tab": selected/active state */
  active?: boolean;
  /** When true, merge props and styles onto the single child (e.g. Link) instead of rendering a button. */
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      loading = false,
      saved = false,
      disabled,
      className = '',
      children,
      type = 'button',
      tooltip,
      active,
      asChild = false,
      ...rest
    },
    ref,
  ) => {
    const effectiveVariant = saved ? 'saved' : loading ? 'loading' : variant;
    const isDisabled = disabled || loading || saved;

    const activeStyles =
      effectiveVariant === 'tab' && active
        ? 'bg-button-accent text-white hover:!bg-button-accent hover:!text-white cursor-default pointer-events-none'
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

    const renderContent = (label: ReactNode) =>
      loading ? (
        <>
          <Loader2 size={iconSizes[size]} className="shrink-0 animate-spin" />
          {label ? <span className="pr-0.5">{label}</span> : null}
        </>
      ) : (
        <>
          {Icon && <Icon size={iconSizes[size]} aria-hidden />}
          {label ? <span className="pr-0.5">{label}</span> : null}
        </>
      );

    if (asChild) {
      const child = Children.only(children);
      if (!isValidElement(child)) {
        throw new Error('Button asChild expects a single React element child');
      }
      const childProps = child.props as { className?: string; children?: ReactNode };
      const mergedClassName = [
        resolvedClassName,
        childProps.className,
      ]
        .filter(Boolean)
        .join(' ');
      return cloneElement(child, {
        ...(child.props && typeof child.props === 'object'
          ? child.props
          : {}),
        className: mergedClassName,
        children: renderContent(childProps.children),
        ref,
      } as Record<string, unknown>);
    }

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
        {renderContent(children)}
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
