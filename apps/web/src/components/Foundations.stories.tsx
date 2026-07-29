import type { Meta, StoryObj } from '@storybook/react';

import {
  colors,
  elevation,
  radii,
  spacingBase,
  typeScale,
} from '@grandprixpicks/shared/tokens';

import { contrastRatio } from '@/lib/color';

/**
 * The design system's foundation layer, rendered straight from
 * packages/shared/src/tokens.ts. Nothing here is transcribed by hand, so these
 * panels cannot drift from what the apps actually paint.
 */

type ColorKey = keyof typeof colors;

function toKebab(key: string) {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * A contrast ratio only means something once you name the pairing. Foreground
 * tokens are rated against the page; background tints are rated by whether body
 * text survives on top of them. Tokens absent from this map (surfaces,
 * hairlines, the button drop shadow, the alpha-washed sprint colours) are never
 * a text/background pair, so rating them would be noise.
 */
const CONTRAST_PAIRING: Partial<Record<ColorKey, 'onPage' | 'textOnIt'>> = {
  text: 'onPage',
  textMuted: 'onPage',
  accent: 'onPage',
  accentHover: 'onPage',
  accentMuted: 'textOnIt',
  buttonAccent: 'textOnIt',
  buttonAccentHover: 'textOnIt',
  racingRed: 'onPage',
  racingRedMuted: 'textOnIt',
  racingAmber: 'onPage',
  sprintText: 'onPage',
  error: 'onPage',
  errorMuted: 'textOnIt',
  success: 'onPage',
  successMuted: 'textOnIt',
  warning: 'onPage',
  warningMuted: 'textOnIt',
};

/** Presentation-only grouping. Any token missing here still renders, under "Other". */
const GROUPS: {
  label: string;
  note: string;
  keys: ColorKey[];
}[] = [
  {
    label: 'Base',
    note: 'Page canvas and the surfaces stacked on it',
    keys: [
      'page',
      'surface',
      'surfaceElevated',
      'surfaceMuted',
      'surfaceHover',
    ],
  },
  {
    label: 'Borders',
    note: 'Hairlines and dividers',
    keys: ['border', 'borderStrong'],
  },
  {
    label: 'Text',
    note: 'Foreground copy',
    keys: ['text', 'textMuted'],
  },
  {
    label: 'Accent',
    note: 'Navigation, icons, highlights',
    keys: ['accent', 'accentHover', 'accentMuted'],
  },
  {
    label: 'Action',
    note: 'Primary buttons, so the question is whether the white label holds up. buttonAccentShadow is the raised bottom edge.',
    keys: ['buttonAccent', 'buttonAccentHover', 'buttonAccentShadow'],
  },
  {
    label: 'Brand',
    note: 'Motorsport livery accents for emphasis and atmosphere',
    keys: ['racingRed', 'racingRedMuted', 'racingAmber'],
  },
  {
    label: 'Sprint',
    note: 'Sprint weekends, the one domain concept with its own colour',
    keys: ['sprint', 'sprintBorder', 'sprintText'],
  },
  {
    label: 'Podium',
    note: 'Leaderboard ranks 1/2/3. Used as medal backgrounds with dark numerals, so they are not rated as foreground colours.',
    keys: ['podiumGold', 'podiumSilver', 'podiumBronze'],
  },
  {
    label: 'Semantic',
    note: 'Status feedback. The muted variants are background tints, rated by whether body text survives on them.',
    keys: [
      'error',
      'errorMuted',
      'success',
      'successMuted',
      'warning',
      'warningMuted',
    ],
  },
];

function ContrastTag({ token }: { token: ColorKey }) {
  const pairing = CONTRAST_PAIRING[token];
  if (!pairing) {
    return null;
  }

  const [against, caption] =
    pairing === 'textOnIt'
      ? [colors.text, 'text on it']
      : [colors.page, 'on page'];

  const ratio = contrastRatio(colors[token], against);
  const grade =
    ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'fail';
  const tone =
    ratio >= 4.5 ? 'text-success' : ratio >= 3 ? 'text-warning' : 'text-error';

  return (
    <span className={`gpp-mono ${tone}`}>
      {ratio.toFixed(1)}:1 {grade}{' '}
      <span className="text-text-muted">({caption})</span>
    </span>
  );
}

function Swatch({ token }: { token: ColorKey }) {
  const hex = colors[token];
  const cssVar = `--${toKebab(token)}`;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <div
        className="h-12 w-12 shrink-0 rounded-md border border-border-strong"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0 text-xs leading-relaxed">
        <div className="font-semibold text-text">{token}</div>
        <div className="gpp-mono text-text-muted uppercase">{hex}</div>
        <div className="gpp-mono text-text-muted">var({cssVar})</div>
        <ContrastTag token={token} />
      </div>
    </div>
  );
}

function Section({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-title text-lg text-text">{label}</h2>
      {note && <p className="mt-1 mb-4 text-xs text-text-muted">{note}</p>}
      {children}
    </section>
  );
}

const meta = {
  title: 'Design System/Foundations',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Colours: Story = {
  render: () => {
    const grouped = new Set(GROUPS.flatMap((group) => group.keys));
    const ungrouped = (Object.keys(colors) as ColorKey[]).filter(
      (key) => !grouped.has(key),
    );
    const sections = ungrouped.length
      ? [
          ...GROUPS,
          {
            label: 'Other',
            note: 'Added to tokens.ts but not yet grouped in this story',
            keys: ungrouped,
          },
        ]
      : GROUPS;

    return (
      <div className="p-6">
        <p className="mb-8 max-w-2xl text-sm text-text-muted">
          Authored in{' '}
          <code className="text-text">packages/shared/src/tokens.ts</code> and
          generated into CSS. Tint any token at any alpha with{' '}
          <code className="text-text">rgb(var(--accent-rgb) / 0.12)</code>.
          Contrast is rated against whichever pairing the token is actually used
          in, noted beside each ratio.
        </p>

        {sections.map((group) => (
          <Section key={group.label} label={group.label} note={group.note}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.keys.map((token) => (
                <Swatch key={token} token={token} />
              ))}
            </div>
          </Section>
        ))}
      </div>
    );
  },
};

export const Radius: Story = {
  render: () => (
    <div className="p-6">
      <p className="mb-8 max-w-2xl text-sm text-text-muted">
        Deliberately tighter than the framework defaults, so the racing geometry
        stays crisp. Identity and status elements keep their full pill shape.
      </p>
      <div className="flex flex-wrap gap-6">
        {(Object.keys(radii) as (keyof typeof radii)[]).map((key) => (
          <div key={key} className="text-center text-xs">
            <div
              className="mb-2 h-24 w-24 border border-border-strong bg-surface-elevated"
              style={{ borderRadius: `${radii[key]}px` }}
            />
            <div className="font-semibold text-text">{key}</div>
            <div className="gpp-mono text-text-muted">{radii[key]}px</div>
            <div className="gpp-mono text-text-muted">rounded-{key}</div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="p-6">
      <p className="mb-8 max-w-2xl text-sm text-text-muted">
        Orbitron carries headings and anything that should read as instrument
        panel. Body copy stays on the system sans stack for legibility.
      </p>

      <Section
        label="Title face"
        note="Orbitron, via --font-title. h1 and h2 pick this up automatically."
      >
        <div className="space-y-3">
          <h1 className="text-4xl text-text">Grand Prix Picks</h1>
          <h2 className="text-2xl text-text">Qualifying results</h2>
          <p className="font-title text-lg text-text">Manual .font-title</p>
        </div>
      </Section>

      <Section label="Body scale" note="System sans stack">
        {(
          [
            ['text-xs', 'Timestamps and metadata'],
            ['text-sm', 'Secondary copy and helper text'],
            ['text-base', 'Default body copy'],
            ['text-lg', 'Lead-in paragraphs'],
            ['text-xl', 'Section intros'],
          ] as const
        ).map(([cls, sample]) => (
          <div
            key={cls}
            className="flex items-baseline gap-4 border-b border-border py-2"
          >
            <code className="w-24 shrink-0 text-xs text-text-muted">{cls}</code>
            <span className={`${cls} text-text`}>{sample}</span>
          </div>
        ))}
      </Section>

      <Section label="Foreground tones">
        <p className="text-text">text-text: primary copy</p>
        <p className="text-text-muted">text-text-muted: secondary copy</p>
      </Section>
    </div>
  ),
};

/**
 * The levers a redesign pulls hardest. Tailwind compiles `p-4` to
 * `calc(var(--spacing) * 4)` and `text-sm` to `var(--text-sm)`, so these
 * numbers retune roughly 3,200 utilities already written across the app
 * without touching a component.
 */
export const SpacingAndType: Story = {
  render: () => (
    <div className="p-6">
      <Section
        label="Spacing"
        note={`Every numeric spacing utility is a multiple of one base unit, currently ${spacingBase}px. This is the density dial for the whole app.`}
      >
        <div className="space-y-2">
          {[1, 2, 3, 4, 6, 8, 12, 16].map((step) => (
            <div key={step} className="flex items-center gap-4">
              <code className="w-16 shrink-0 text-xs text-text-muted">
                {step}
              </code>
              <div
                className="h-4 rounded-sm bg-accent-muted"
                style={{ width: `calc(var(--spacing) * ${step})` }}
              />
              <span className="gpp-mono text-xs text-text-muted">
                {spacingBase * step}px
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        label="Type scale"
        note="Names match the Tailwind scale, so text-sm in a component and sm here are the same thing."
      >
        <div className="space-y-3">
          {(Object.keys(typeScale) as (keyof typeof typeScale)[]).map((key) => {
            const { size, lineHeight } = typeScale[key];
            return (
              <div key={key} className="flex items-baseline gap-4">
                <code className="w-16 shrink-0 text-xs text-text-muted">
                  {key}
                </code>
                <span
                  className="min-w-0 truncate text-text"
                  style={{ fontSize: `${size / 16}rem` }}
                >
                  Grand Prix Picks
                </span>
                <span className="gpp-mono ml-auto shrink-0 text-xs text-text-muted">
                  {size}
                  {lineHeight === null ? ' / 1' : ` / ${lineHeight}`}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        label="Elevation"
        note="Neutral black, never tinted: on a near-black canvas a coloured shadow reads as a glow, and glows are done explicitly instead."
      >
        <div className="flex flex-wrap gap-6">
          {(Object.keys(elevation) as (keyof typeof elevation)[]).map((key) => (
            <div key={key} className="text-center">
              <div
                className="mb-2 h-20 w-20 rounded-lg border border-border bg-surface-elevated"
                style={{ boxShadow: elevation[key] }}
              />
              <code className="text-xs text-text-muted">shadow-{key}</code>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
};
