const FLAG_BASE_PATH = '/flags';

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
  /** Fills container height; parent must have defined height. */
  full: {
    width: 0,
    height: 0,
    className: 'h-full w-auto object-contain',
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

/** Country flag component backed by same-origin SVG assets. */
export function Flag({ code, size = 'sm', className = '' }: FlagProps) {
  const { width, height, className: sizeClassName } = SIZES[size];
  const lowerCode = code.toLowerCase();

  const isFull = size === 'full';
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden ${isFull ? 'h-full' : ''} ${className}`}
    >
      <img
        src={`${FLAG_BASE_PATH}/${lowerCode}.svg`}
        alt=""
        width={isFull ? undefined : width}
        height={isFull ? undefined : height}
        className={`${sizeClassName} ${isFull ? '' : 'object-cover'}`}
        loading="eager"
        decoding="sync"
      />
    </span>
  );
}
