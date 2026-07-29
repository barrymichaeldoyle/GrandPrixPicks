import type { SyntheticEvent } from 'react';

const FLAG_BASE_PATH = '/flags';

/**
 * If a flag asset is missing (404), hide the element so we show an empty box
 * instead of the browser's broken-image glyph. Keeps layout via visibility.
 */
function hideBrokenFlag(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = 'hidden';
}

/**
 * Widths are derived from the height at the shared 4:3 ratio, not measured
 * from each asset. See `.gpp-flag` in styles.css for why.
 */
const SIZES = {
  xs: { width: 16, height: 12, className: 'h-3 w-4' },
  sm: { width: 20, height: 15, className: 'h-[15px] w-5' },
  md: { width: 24, height: 18, className: 'h-[18px] w-6' },
  lg: { width: 40, height: 30, className: 'h-[30px] w-10' },
  xl: { width: 56, height: 42, className: 'h-[42px] w-14' },
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

/**
 * Country flag, backed by same-origin SVG assets.
 *
 * Every size renders in the same 4:3 box with the artwork cropped to fill, so
 * a flag is a predictable width wherever it appears. Previously `full` used
 * `w-auto` and let each asset's own viewBox decide, which meant the header
 * pill, the race cards and the home hero all changed width from round to
 * round — Qatar (4.17:1) drew 3.6x wider than Belgium (1.15:1) at the same
 * height.
 */
export function Flag({ code, size = 'sm', className = '' }: FlagProps) {
  const lowerCode = code.toLowerCase();
  const src = `${FLAG_BASE_PATH}/${lowerCode}.svg`;

  // "full" takes its height from the parent; `.gpp-flag`'s aspect-ratio then
  // fixes the width. Rendered without a wrapper so flex stretching cascades.
  if (size === 'full') {
    return (
      <img
        src={src}
        alt=""
        width={40}
        height={30}
        className={`gpp-flag h-full w-auto max-w-none ${className}`}
        loading="eager"
        decoding="sync"
        onError={hideBrokenFlag}
      />
    );
  }

  const { width, height, className: sizeClassName } = SIZES[size];
  return (
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      className={`gpp-flag shrink-0 ${sizeClassName} ${className}`}
      loading="eager"
      decoding="sync"
      onError={hideBrokenFlag}
    />
  );
}
