import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
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
  text: 'border border-transparent bg-transparent text-accent hover:bg-accent-muted/50 disabled:text-text-muted disabled:hover:bg-transparent disabled:cursor-not-allowed',
  tab: 'font-medium text-text-muted hover:bg-surface-muted hover:text-text disabled:bg-transparent disabled:text-text-muted/50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted/50',
} as const;

const sizes = {
  inline: 'gap-1 rounded px-1.5 py-0.5 text-xs',
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 gap-1.5 px-4 text-base',
  tab: 'h-9 rounded-md px-3 text-sm',
} as const;

/** Icon size (px) per button size for consistent alignment. */
const iconSizes: Record<keyof typeof sizes, number> = {
  inline: 14,
  sm: 16,
  md: 20,
  tab: 14,
};

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lucide icon shown before children; size is derived from button size. */
  leftIcon?: LucideIcon;
  /** Lucide icon shown after children (e.g. ArrowRight for "Continue" actions). */
  rightIcon?: LucideIcon;
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
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
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

    function renderContent(label: ReactNode) {
      const normalContent = (
        <>
          {LeftIcon && <LeftIcon size={iconSizes[size]} aria-hidden />}
          {label ? (
            <span className="inline-flex items-center pr-0.5">{label}</span>
          ) : null}
          {RightIcon && <RightIcon size={iconSizes[size]} aria-hidden />}
        </>
      );
      if (loading) {
        return (
          <span className="relative inline-flex items-center justify-center">
            {/* Invisible copy preserves button size to prevent layout shift */}
            <span className="invisible inline-flex items-center" aria-hidden>
              {normalContent}
            </span>
            <Loader2
              size={iconSizes[size]}
              className="absolute top-1/2 left-1/2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-spin"
              aria-hidden
            />
          </span>
        );
      }
      return normalContent;
    }

    if (asChild) {
      const child = Children.only(children);
      if (!isValidElement(child)) {
        throw new Error('Button asChild expects a single React element child');
      }
      const childProps = child.props as {
        className?: string;
        children?: ReactNode;
      };
      const mergedClassName = [resolvedClassName, childProps.className]
        .filter(Boolean)
        .join(' ');
      return cloneElement(child, {
        ...(child.props && typeof child.props === 'object' ? child.props : {}),
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
