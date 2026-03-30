import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
  /** Open tooltip on click/tap instead of hover-only. */
  openOnClick?: boolean;
  /** Ignore click/tap handling when the event starts inside this selector. */
  ignoreClickWithinSelector?: string;
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

  const idealLeft = centerX - tooltipWidth / 2;
  const maxLeft = Math.max(pad, vw - pad - tooltipWidth);
  const left = Math.max(pad, Math.min(maxLeft, idealLeft));

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

  return { top, left, placement };
}

function updateTooltipPosition(
  triggerEl: HTMLSpanElement,
  tooltipEl: HTMLSpanElement,
  placement: 'top' | 'bottom',
  distance: number,
  setCoords: Dispatch<SetStateAction<{ top: number; left: number }>>,
  setEffectivePlacement: Dispatch<SetStateAction<'top' | 'bottom'>>,
) {
  const triggerRect = triggerEl.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();

  const {
    top,
    left,
    placement: nextPlacement,
  } = computeConstrainedPosition(
    triggerRect,
    tooltipRect.width,
    tooltipRect.height,
    placement,
    distance,
  );

  setCoords((prev) =>
    prev.top === top && prev.left === left ? prev : { top, left },
  );
  setEffectivePlacement((prev) =>
    prev === nextPlacement ? prev : nextPlacement,
  );
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
  openOnClick = false,
  ignoreClickWithinSelector,
}: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByTouchRef = useRef(false);
  const openedByClickRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [doAnimate, setDoAnimate] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [effectivePlacement, setEffectivePlacement] = useState<
    'top' | 'bottom'
  >(placement);

  function shouldIgnoreClickTarget(target: EventTarget | null): boolean {
    if (!ignoreClickWithinSelector || !(target instanceof Element)) {
      return false;
    }
    return target.closest(ignoreClickWithinSelector) !== null;
  }

  function openAtTrigger() {
    setIsVisible(true);
  }

  useLayoutEffect(() => {
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!isVisible || !triggerEl || !tooltipEl) {
      return;
    }
    updateTooltipPosition(
      triggerEl,
      tooltipEl,
      placement,
      distance,
      setCoords,
      setEffectivePlacement,
    );
  }, [distance, isVisible, placement]);

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
    function handleScroll() {
      openedByTouchRef.current = false;
      setIsVisible(false);
    }
    function handleResize() {
      const triggerEl = triggerRef.current;
      const tooltipEl = tooltipRef.current;
      if (!triggerEl || !tooltipEl) {
        return;
      }
      updateTooltipPosition(
        triggerEl,
        tooltipEl,
        placement,
        distance,
        setCoords,
        setEffectivePlacement,
      );
    }
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    const rafId = requestAnimationFrame(() => setDoAnimate(true));
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [distance, isVisible, placement]);

  // Close when the tooltip was opened by touch or click and the user interacts outside.
  useEffect(() => {
    if (
      !isVisible ||
      (!openedByTouchRef.current && !openedByClickRef.current)
    ) {
      return;
    }
    function handleOutsidePointerDown(e: PointerEvent) {
      if (triggerRef.current?.contains(e.target as Node)) {
        return;
      }
      openedByTouchRef.current = false;
      openedByClickRef.current = false;
      setIsVisible(false);
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () =>
      document.removeEventListener(
        'pointerdown',
        handleOutsidePointerDown,
        true,
      );
  }, [isVisible]);

  function handlePointerDown(e: React.PointerEvent) {
    if (shouldIgnoreClickTarget(e.target)) {
      if (isVisible) {
        setIsVisible(false);
      }
      return;
    }
    if (e.pointerType !== 'touch') {
      return;
    }
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    openedByTouchRef.current = true;
    openedByClickRef.current = false;
    openAtTrigger();
  }

  function handleClick(e: React.MouseEvent) {
    if (!openOnClick) {
      return;
    }
    if (shouldIgnoreClickTarget(e.target)) {
      if (isVisible) {
        setIsVisible(false);
      }
      return;
    }
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    const nextVisible = !isVisible || !openedByClickRef.current;
    openedByTouchRef.current = false;
    openedByClickRef.current = nextVisible;
    if (nextVisible) {
      openAtTrigger();
      return;
    }
    setIsVisible(false);
  }

  function handlePointerEnter(e: React.PointerEvent) {
    if (openOnClick) {
      return;
    }
    if (e.pointerType !== 'mouse') {
      return;
    }
    openTimeoutRef.current = setTimeout(() => {
      openTimeoutRef.current = null;
      openAtTrigger();
    }, OPEN_DELAY_MS);
  }

  function handlePointerLeave(e: React.PointerEvent) {
    if (openOnClick) {
      return;
    }
    if (e.pointerType !== 'mouse') {
      return;
    }
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    setIsVisible(false);
  }

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
      id={tooltipId}
      className="pointer-events-none fixed z-9999 transition-[opacity,transform] duration-150 ease-out"
      role="tooltip"
      style={{
        left: coords.left,
        top: coords.top,
        transform: `translateY(${translateY}) translateY(${slideOffset})`,
        opacity,
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      {isDefaultStyle ? (
        <span className="block max-w-[calc(100vw-16px)] rounded bg-slate-800 px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-sm dark:bg-slate-700">
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
        aria-describedby={tooltipId}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {children}
      </span>
      {tooltipEl && createPortal(tooltipEl, document.body)}
    </>
  );
}
