/** Decorative angled speed lines behind the home hero. */
export function HeroSpeedLines() {
  return (
    <svg
      aria-hidden="true"
      className="home-hero-lines pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="hero-line-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(34,211,238,0)" />
          <stop offset="45%" stopColor="rgba(240,68,85,0.64)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
        <linearGradient id="hero-line-fade-2" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(20,184,166,0)" />
          <stop offset="50%" stopColor="rgba(255,176,32,0.38)" />
          <stop offset="100%" stopColor="rgba(20,184,166,0)" />
        </linearGradient>
      </defs>
      <g transform="rotate(-8 600 300)">
        <line
          x1="-100"
          x2="1300"
          y1="120"
          y2="120"
          stroke="url(#hero-line-fade)"
          strokeWidth="1"
        />
        <line
          x1="-100"
          x2="1300"
          y1="200"
          y2="200"
          stroke="url(#hero-line-fade-2)"
          strokeWidth="1"
        />
        <line
          x1="-100"
          x2="1300"
          y1="430"
          y2="430"
          stroke="url(#hero-line-fade-2)"
          strokeWidth="1"
        />
        <line
          x1="-100"
          x2="1300"
          y1="510"
          y2="510"
          stroke="url(#hero-line-fade)"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}
