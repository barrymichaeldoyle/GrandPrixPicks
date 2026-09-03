import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useModalDialog } from '@/hooks/useModalDialog';

/**
 * A write-up's circuit map, with the corner legend that makes it readable.
 *
 * The map labels corners by number and the prose names them, so `corners` is
 * the lookup between the two rather than a caption describing the picture.
 *
 * The artwork carries its own background, so the figure gives it no panel fill
 * and no padding: a surface-coloured box around a picture that already has a
 * background reads as two panels, one inside the other. `width` and `height`
 * are required because these maps sit above the fold on a phone and a reflow
 * here was worth 0.1 of CLS.
 */
export type RaceWriteupTrackMapProps = {
  /** The largest rendition. Also what the enlarged view loads. */
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
  /** Corner numbers as printed on the map, paired with the name in the prose. */
  corners: readonly (readonly [string, string])[];
  /** Names the circuit in the enlarged view's heading, e.g. "Monza". */
  circuitName: string;
  /**
   * Which corner of the map the enlarge control sits on. It has to land on
   * empty ground, and which corner is empty is a fact about the drawn lap:
   * Monza's is the top right, Madrid's is the bottom right.
   */
  controlCorner?: 'top-right' | 'bottom-right';
};

export function RaceWriteupTrackMap({
  src,
  srcSet,
  sizes,
  width,
  height,
  alt,
  corners,
  circuitName,
  controlCorner = 'top-right',
}: RaceWriteupTrackMapProps) {
  const [enlarged, setEnlarged] = useState(false);

  return (
    <figure>
      {/*
        The control sits on a corner of the map that is empty ground. On its own
        line under the figure it read as a third caption competing with the
        legend, when what it does is act on the picture it is now sitting on.
        Which corner is free is a property of the drawn lap, so it is a prop.

        A button rather than a link to the image file. The map is 16:9, so held
        to a phone's 366px the whole lap is legible but the turn badges render
        at 8px — which is the one thing on the map a reader has to be able to
        read. Sending them to the raw file in a new tab solved that by handing
        the page over to the browser's image viewer, with the back button as the
        only way home. This opens over the page and closes again.
      */}
      <div className="relative">
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          width={width}
          height={height}
          decoding="async"
          className="h-auto w-full rounded-sm"
          alt={alt}
        />
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          aria-label="Enlarge the map"
          className={`absolute right-2 ${
            controlCorner === 'bottom-right' ? 'bottom-2' : 'top-2'
          } inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-border bg-surface-elevated px-2.5 text-xs font-semibold text-text-muted hover:border-border-strong hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h6v6" />
            <path d="m21 3-7 7" />
            <path d="m3 21 7-7" />
            <path d="M9 21H3v-6" />
          </svg>
          Enlarge
        </button>
      </div>
      <CornerLegend corners={corners} className="mt-3" />
      {enlarged ? (
        <EnlargedMap
          src={src}
          alt={alt}
          corners={corners}
          circuitName={circuitName}
          onClose={() => setEnlarged(false)}
        />
      ) : null}
    </figure>
  );
}

function CornerLegend({
  corners,
  className,
}: {
  corners: readonly (readonly [string, string])[];
  className?: string;
}) {
  return (
    <figcaption
      className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted ${className ?? ''}`}
    >
      {corners.map(([turns, name]) => (
        <span key={name}>
          <span className="gpp-mono text-text">{turns}</span> {name}
        </span>
      ))}
    </figcaption>
  );
}

function EnlargedMap({
  src,
  alt,
  corners,
  circuitName,
  onClose,
}: {
  src: string;
  alt: string;
  corners: readonly (readonly [string, string])[];
  circuitName: string;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>({
    onClose,
    initialFocusRef: closeButtonRef,
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enlarged-track-map-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-sm border border-border bg-surface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2
            id="enlarged-track-map-title"
            className="font-title font-medium text-text"
          >
            {circuitName} lap map
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-sm p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Close the lap map"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        {/*
          `min-w-[52rem]` is the point of the enlarged view: below it the turn
          badges stop being readable, so on a narrow screen the map keeps that
          width and the container scrolls sideways instead of shrinking it. On
          anything wider the minimum never binds and the map simply fills.
        */}
        <div className="min-h-0 overflow-auto">
          <img
            src={src}
            alt={alt}
            className="w-full max-w-none min-w-[52rem]"
          />
        </div>
        <CornerLegend
          corners={corners}
          className="border-t border-border px-4 py-3"
        />
      </div>
    </div>,
    document.body,
  );
}
