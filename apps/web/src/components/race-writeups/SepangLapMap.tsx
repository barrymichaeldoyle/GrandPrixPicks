import type { ReactNode } from 'react';

import {
  SEPANG_CORNERS,
  SEPANG_OVERTAKE,
  SEPANG_SECTORS,
  SEPANG_SPEED_TRAP,
  SEPANG_START_FINISH,
  SEPANG_STRAIGHT_MODE_ZONES,
  SEPANG_VIEW_BOX,
} from '@/lib/sepangCircuitGeometry';

import { RaceWriteupTrackMap } from './RaceWriteupTrackMap';

const SECTOR_COLOURS = [
  'var(--track-sector1)',
  'var(--track-sector2)',
  'var(--track-sector3)',
] as const;

const LABEL =
  'Sepang lap map. Turns are numbered 1 to 15, with the three sectors, four straight mode zones (Turn 3 to Turn 4, Turn 8 to Turn 9, the back straight into Turn 15, and the main straight), the speed trap on the back straight, and the Overtake detection and activation points either side of the Turn 15 hairpin.';

/**
 * Sepang drawn from its own geometry, in the palette, rather than a recoloured
 * copy of someone else's artwork. The outline and the markers come from
 * `scripts/generate-sepang-geometry.mts`; this file only decides how they look.
 *
 * Markers are named in a key under the map rather than in chips on it. Chips
 * sized to be read on a phone crowd the lap; the key is text and stays sharp.
 */
export function SepangLapMap({
  corners,
}: {
  corners: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <RaceWriteupTrackMap
        drawing={<Drawing />}
        corners={corners}
        circuitName="Sepang"
      />
      <MapKey />
    </div>
  );
}

function Drawing() {
  const { x, y, angle } = SEPANG_START_FINISH;
  return (
    <svg
      viewBox={`0 0 ${SEPANG_VIEW_BOX.width} ${SEPANG_VIEW_BOX.height}`}
      className="h-auto w-full"
      role="img"
      aria-label={LABEL}
    >
      {SEPANG_SECTORS.map((d) => (
        <path
          key={`edge-${d.slice(0, 12)}`}
          d={d}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={18}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {SEPANG_SECTORS.map((d, i) => (
        <path
          key={`sector-${d.slice(0, 12)}`}
          d={d}
          fill="none"
          stroke={SECTOR_COLOURS[i]}
          strokeWidth={6}
          strokeLinejoin="round"
        />
      ))}
      {SEPANG_STRAIGHT_MODE_ZONES.map((d) => (
        <path
          key={d.slice(0, 12)}
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={8}
          strokeDasharray="2 5"
        />
      ))}

      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        <line
          x1={0}
          y1={-13}
          x2={0}
          y2={13}
          stroke="var(--text)"
          strokeWidth={4}
        />
        <polyline
          points="18,-6 26,0 18,6"
          fill="none"
          stroke="var(--text)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <SpeedTrapMark x={SEPANG_SPEED_TRAP.x} y={SEPANG_SPEED_TRAP.y} />
      <DetectionMark
        x={SEPANG_OVERTAKE.detection.x}
        y={SEPANG_OVERTAKE.detection.y}
      />
      <ActivationMark
        x={SEPANG_OVERTAKE.activation.x}
        y={SEPANG_OVERTAKE.activation.y}
      />

      {SEPANG_CORNERS.map((c) => (
        <g key={c.number}>
          <circle cx={c.x} cy={c.y} r={14} fill="var(--text)" />
          <text
            x={c.x}
            y={c.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={15}
            fontWeight={700}
            fill="var(--page)"
          >
            {c.number}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SpeedTrapMark({ x, y }: { x: number; y: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={7}
      fill="var(--accent)"
      stroke="var(--page)"
      strokeWidth={2.5}
    />
  );
}

function DetectionMark({ x, y }: { x: number; y: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={7}
      fill="var(--success)"
      stroke="var(--page)"
      strokeWidth={2.5}
    />
  );
}

function ActivationMark({ x, y }: { x: number; y: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={6.5}
      fill="var(--page)"
      stroke="var(--success)"
      strokeWidth={3.5}
    />
  );
}

function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 16"
      width={24}
      height={16}
      aria-hidden
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function MapKey() {
  const items: [ReactNode, string][] = [
    ...SECTOR_COLOURS.map((colour, i): [ReactNode, string] => [
      <line
        key="l"
        x1={2}
        y1={8}
        x2={22}
        y2={8}
        stroke={colour}
        strokeWidth={4}
      />,
      `Sector ${i + 1}`,
    ]),
    [
      <line
        key="l"
        x1={1}
        y1={8}
        x2={23}
        y2={8}
        stroke="var(--accent)"
        strokeWidth={6}
        strokeDasharray="2 3"
      />,
      'Straight mode zone',
    ],
    [<SpeedTrapMark key="m" x={12} y={8} />, 'Speed trap'],
    [<DetectionMark key="m" x={12} y={8} />, 'Overtake detection'],
    [<ActivationMark key="m" x={12} y={8} />, 'Overtake activation'],
  ];
  return (
    <div className="mt-2 text-xs text-text-muted">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map(([mark, label]) => (
          <li key={label} className="flex items-center gap-1.5">
            <Swatch>{mark}</Swatch>
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-2">
        Outline ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="underline underline-offset-2 hover:text-text"
        >
          OpenStreetMap contributors
        </a>
      </p>
    </div>
  );
}
