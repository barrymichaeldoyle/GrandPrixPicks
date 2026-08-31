import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Children, cloneElement, isValidElement } from 'react';

import { Tooltip } from '@/components/Tooltip';

/**
 * Nothing scales and nothing shifts position on press — the previous
 * `active:translate-y-px` was part of the raised-button look this direction
 * removes. Press is a colour change only, and there is no elevation left to
 * transition.
 */
const base =
  'inline-flex items-center justify-center gap-1 rounded-sm font-medium leading-none tracking-tight transition-[color,background-color,border-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none [&_svg]:block [&_svg]:shrink-0';

const variants = {
  // The accent IS the primary action. Text on accent is near-black, and a
  // primary button is the one place the accent is allowed to be a large fill.
  primary:
    'border border-transparent bg-accent hover:bg-accent-hover active:bg-accent-press text-text-on-accent font-semibold disabled:bg-surface-elevated disabled:text-text-disabled disabled:cursor-not-allowed',
  // Destructive actions are amber, not red: the only red in this system is a
  // downward position delta. Outlined at rest so a delete never out-weighs the
  // primary action beside it, solid once the pointer has committed to it.
  danger:
    'border border-error/40 bg-transparent text-error hover:bg-error hover:text-text-on-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-error',
  saved:
    'border border-success/30 bg-success-muted text-success cursor-default',
  loading: 'cursor-wait opacity-70',
  secondary:
    'border border-border bg-transparent hover:border-border-strong hover:bg-surface-elevated text-text disabled:opacity-40 disabled:cursor-not-allowed',
  text: 'border border-transparent bg-transparent text-text-muted hover:bg-surface hover:text-text disabled:text-text-disabled disabled:hover:bg-transparent disabled:cursor-not-allowed',
  tab: 'border border-transparent text-text-muted hover:bg-surface hover:text-text disabled:bg-transparent disabled:text-text-disabled disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-disabled',
} as const;

/**
 * Heights come from the density tokens: 36px compact, 44px touch target.
 *
 * The compact sizes grow to the touch target on coarse pointers. A 36px control
 * is comfortable under a mouse and awkward under a thumb, and the phone is
 * where most of these are actually used, so the density is spent where it buys
 * something rather than applied uniformly. `pointer-coarse` keys off the input
 * device, not the viewport, so a small window on a laptop stays compact and a
 * large tablet does not.
 *
 * Widths are untouched: only the vertical hit area was short.
 *
 * The icon-to-label gap is one step above the base 4px for both standard
 * sizes: at 4px a leading icon reads as glued to the first letter rather than
 * as its own mark. `inline` keeps the tighter base, where the whole control is
 * only slightly bigger than its text.
 */
const sizes = {
  // `gpp-touch-target` carries the AA floor (24px) on every pointer; the
  // `pointer-coarse` bump above it goes on to the 44px touch target. Only the
  // coarse case was handled before, which passed a thumb and failed a mouse on
  // the same criterion — 2.5.8 is written about pointers, not touch. Measured
  // at 57x20 for "Edit" on the dashboard, so it was short on the axis the
  // padding could not fix without making an inline affordance look like a
  // button.
  inline:
    'gpp-touch-target gap-1 rounded-sm px-1.5 py-0.5 text-xs pointer-coarse:min-h-11 pointer-coarse:px-2.5',
  sm: 'h-9 gap-2 px-4 text-sm pointer-coarse:h-11',
  md: 'h-11 gap-2 px-5 text-base',
  tab: 'h-9 rounded-sm px-3 text-sm pointer-coarse:h-11',
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
  ref?: Ref<HTMLButtonElement>;
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

function Button({
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
  ref,
  ...rest
}: ButtonProps) {
  const effectiveVariant = saved ? 'saved' : variant;
  const isDisabled = disabled || loading || saved;

  // Selected = raised surface + accent hairline, the system's one selection
  // treatment. Applied to rows and slots as the stripe instead.
  const activeStyles =
    effectiveVariant === 'tab' && active
      ? 'border border-accent-hairline bg-surface-elevated !text-accent hover:!bg-surface-elevated hover:!text-accent cursor-default pointer-events-none'
      : '';

  const resolvedClassName = [
    base,
    sizes[size],
    variants[effectiveVariant],
    loading ? variants.loading : '',
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
          <span className="inline-flex items-center px-0.5">{label}</span>
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
    // Forwarded refs are opaque handles; cloneElement does not inspect them.
    // oxlint-disable-next-line react/refs
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
}

export { Button };

/** Class names for styling a link as a primary button (e.g. Link from react-router). */
export function primaryButtonStyles(size: ButtonSize = 'md'): string {
  return [base, sizes[size], variants.primary].join(' ');
}
