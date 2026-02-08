import type { ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  /** Tooltip content shown on hover (string = default dark style, ReactNode = custom) */
  content: string | ReactNode;
  /** Trigger element(s) */
  children: ReactNode;
  /** Placement relative to trigger */
  placement?: 'top' | 'bottom';
  /** Pixels between trigger and tooltip (avoids overlap on small touch targets) */
  distance?: number;
  /** Extra classes for the trigger wrapper (e.g. flex-1 for flex layouts) */
  triggerClassName?: string;
  /** Pre-render tooltip content immediately (for preloading images) */
  prerender?: boolean;
}

const DEFAULT_DISTANCE = 6;
const VIEWPORT_PADDING = 8;
const OPEN_DELAY_MS = 250;

function computeConstrainedPosition(
  triggerRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferredPlacement: 'top' | 'bottom',
  distance: number,
): { top: number; left: number; placement: 'top' | 'bottom' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = VIEWPORT_PADDING;
  const centerX = triggerRect.left + triggerRect.width / 2;

  // Clamp horizontal center so tooltip stays in viewport
  const minCenterX = pad + tooltipWidth / 2;
  const maxCenterX = vw - pad - tooltipWidth / 2;
  const clampedX = Math.max(minCenterX, Math.min(maxCenterX, centerX));

  // Try preferred placement, flip if it would overflow
  let placement = preferredPlacement;
  let top: number;

  if (placement === 'top') {
    const tooltipBottom = triggerRect.top - distance;
    const tooltipTop = tooltipBottom - tooltipHeight;
    if (tooltipTop < pad) {
      placement = 'bottom';
      top = triggerRect.bottom + distance;
    } else {
      top = tooltipBottom;
    }
  } else {
    top = triggerRect.bottom + distance;
    const tooltipBottom = top + tooltipHeight;
    if (tooltipBottom > vh - pad) {
      placement = 'top';
      top = triggerRect.top - distance;
    }
  }

  return { top, left: clampedX, placement };
}

/**
 * A custom tooltip that appears quickly on hover.
 * Renders in a portal to avoid clipping by overflow containers.
 * Constrains position to stay within the viewport.
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  distance = DEFAULT_DISTANCE,
  triggerClassName,
  prerender = false,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByTouchRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [doAnimate, setDoAnimate] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [effectivePlacement, setEffectivePlacement] = useState<
    'top' | 'bottom'
  >(placement);

  const openAtTrigger = useCallback(() => {
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: placement === 'top' ? rect.top - distance : rect.bottom + distance,
        left: rect.left + rect.width / 2,
      });
      setEffectivePlacement(placement);
    }
    setIsVisible(true);
  }, [placement, distance]);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    const {
      top,
      left,
      placement: p,
    } = computeConstrainedPosition(
      triggerRect,
      tooltipRect.width,
      tooltipRect.height,
      placement,
      distance,
    );
    setCoords({ top, left });
    setEffectivePlacement(p);
  }, [placement, distance]);

  useLayoutEffect(() => {
    if (!isVisible || !tooltipRef.current) return;
    updatePosition();
  }, [isVisible, updatePosition]);

  useEffect(
    () => () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isVisible) {
      setDoAnimate(false);
      return;
    }
    // Track that tooltip has been shown (keeps content mounted for caching)
    setHasBeenVisible(true);
    const handleScroll = () => {
      openedByTouchRef.current = false;
      setIsVisible(false);
    };
    const handleResize = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    const rafId = requestAnimationFrame(() => setDoAnimate(true));
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [isVisible, updatePosition]);

  // On mobile: close when user taps outside (tooltip was opened by touch)
  useEffect(() => {
    if (!isVisible || !openedByTouchRef.current) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      openedByTouchRef.current = false;
      setIsVisible(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isVisible]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    openedByTouchRef.current = true;
    openAtTrigger();
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    openTimeoutRef.current = setTimeout(() => {
      openTimeoutRef.current = null;
      openAtTrigger();
    }, OPEN_DELAY_MS);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const translateY = effectivePlacement === 'top' ? '-100%' : '0';
  const slideOffset = doAnimate
    ? '0'
    : effectivePlacement === 'top'
      ? '4px'
      : '-4px';
  const opacity = doAnimate ? 1 : 0;

  const isDefaultStyle = typeof content === 'string';
  // Keep tooltip mounted after first show to preserve cached images
  // prerender allows immediate mounting for image preloading
  const shouldRender = isVisible || hasBeenVisible || prerender;
  const tooltipEl = typeof document !== 'undefined' && shouldRender && (
    <span
      ref={tooltipRef}
      className="pointer-events-none fixed z-[9999] transition-[opacity,transform] duration-150 ease-out"
      role="tooltip"
      style={{
        left: coords.left,
        top: coords.top,
        transform: `translate(-50%, ${translateY}) translateY(${slideOffset})`,
        opacity,
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      {isDefaultStyle ? (
        <span className="block rounded bg-text px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-sm">
          {content}
        </span>
      ) : (
        content
      )}
    </span>
  );

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex cursor-help ${triggerClassName ?? ''}`.trim()}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {children}
      </span>
      {tooltipEl && createPortal(tooltipEl, document.body)}
    </>
  );
}
