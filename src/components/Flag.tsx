const FLAG_CDN = 'https://flagcdn.com';

// flagcdn.com only supports specific widths: 20, 40, 80, 160, 320
const SIZES = {
  xs: {
    width: 16,
    height: 12,
    className: 'h-3 w-4',
    cdnWidth: 40,
    cdnWidth2x: 80,
  },
  sm: {
    width: 20,
    height: 15,
    className: 'h-[15px] w-5',
    cdnWidth: 40,
    cdnWidth2x: 80,
  },
  md: {
    width: 24,
    height: 18,
    className: 'h-[18px] w-6',
    cdnWidth: 80,
    cdnWidth2x: 160,
  },
  lg: {
    width: 40,
    height: 30,
    className: 'h-[30px] w-10',
    cdnWidth: 80,
    cdnWidth2x: 160,
  },
  xl: {
    width: 56,
    height: 42,
    className: 'h-[42px] w-14',
    cdnWidth: 160,
    cdnWidth2x: 320,
  },
} as const;

type FlagSize = keyof typeof SIZES;

interface FlagProps {
  /** ISO 3166-1 alpha-2 country code (e.g., "NL", "GB", "US") */
  code: string;
  /** Size variant */
  size?: FlagSize;
  /** Additional class names */
  className?: string;
}

/**
 * Country flag component using flagcdn.com.
 * Automatically handles retina displays with srcSet.
 */
export function Flag({ code, size = 'sm', className = '' }: FlagProps) {
  const {
    width,
    height,
    className: sizeClassName,
    cdnWidth,
    cdnWidth2x,
  } = SIZES[size];
  const lowerCode = code.toLowerCase();

  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-sm shadow-sm ring-1 ring-black/10 ${className}`}
    >
      <img
        src={`${FLAG_CDN}/w${cdnWidth}/${lowerCode}.png`}
        srcSet={`${FLAG_CDN}/w${cdnWidth2x}/${lowerCode}.png 2x`}
        alt=""
        width={width}
        height={height}
        className={`${sizeClassName} object-cover`}
        loading="eager"
        decoding="sync"
      />
    </span>
  );
}
