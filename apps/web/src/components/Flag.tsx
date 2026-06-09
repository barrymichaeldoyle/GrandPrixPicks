import type { SyntheticEvent } from 'react';

const FLAG_BASE_PATH = '/flags';

/**
 * If a flag asset is missing (404), hide the element so we show an empty box
 * instead of the browser's broken-image glyph. Keeps layout via visibility.
 */
function hideBrokenFlag(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = 'hidden';
}

const SIZES = {
  xs: {
    width: 16,
    height: 12,
    className: 'h-3 w-4',
  },
  sm: {
    width: 20,
    height: 15,
    className: 'h-[15px] w-5',
  },
  md: {
    width: 24,
    height: 18,
    className: 'h-[18px] w-6',
  },
  lg: {
    width: 40,
    height: 30,
    className: 'h-[30px] w-10',
  },
  xl: {
    width: 56,
    height: 42,
    className: 'h-[42px] w-14',
  },
} as const;

type FixedFlagSize = keyof typeof SIZES;
type FlagSize = FixedFlagSize | 'full';

interface FlagProps {
  /** ISO 3166-1 alpha-2 country code (e.g., "NL", "GB", "US") */
  code: string;
  /** Size variant */
  size?: FlagSize;
  /** Additional class names */
  className?: string;
}

/** Country flag component backed by same-origin SVG assets. */
export function Flag({ code, size = 'sm', className = '' }: FlagProps) {
  const lowerCode = code.toLowerCase();
  const src = `${FLAG_BASE_PATH}/${lowerCode}.svg`;

  // "full" fills the parent's height with aspect ratio from the SVG's viewBox.
  // Render the img directly (no wrapper span) so flex stretching cascades and
  // Tailwind's preflight `max-width: 100%` doesn't conflict with an
  // inline-block parent whose width depends on the img itself.
  if (size === 'full') {
    return (
      <img
        src={src}
        alt=""
        className={`block h-full w-auto max-w-none object-contain ${className}`}
        loading="eager"
        decoding="sync"
        onError={hideBrokenFlag}
      />
    );
  }

  const { width, height, className: sizeClassName } = SIZES[size];
  return (
    <span className={`inline-block shrink-0 overflow-hidden ${className}`}>
      <img
        src={src}
        alt=""
        width={width}
        height={height}
        className={`${sizeClassName} object-cover`}
        loading="eager"
        decoding="sync"
        onError={hideBrokenFlag}
      />
    </span>
  );
}
