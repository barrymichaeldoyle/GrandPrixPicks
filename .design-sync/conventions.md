## Conventions for Grand Prix Picks

An F1 prediction game. The look is a dark race-telemetry dashboard: near-black
page, slightly lighter panels, teal accent, crimson for primary actions.

### Wrap everything in PreviewRoot

`window.GrandPrixPicks.PreviewRoot` is required, not decorative. It does three
things, and all of them are load-bearing:

1. Sets `.dark` and `data-theme="dark"` on `<html>`. **This design system is
   dark only.** Every colour token is declared under `.dark, [data-theme='dark']`,
   so without the wrapper every colour silently falls back to a browser default.
   It goes on the document element because `Tooltip` and `ConfirmDialog` render
   through a portal onto `document.body`, outside any wrapper div.
2. Supplies the auth/data runtime, so components that read a signed-in user or
   query data render a populated demo state instead of crashing.
3. Supplies router context. Anything rendering a link needs it.

```jsx
const { PreviewRoot, PageHeader, Button } = window.GrandPrixPicks;

<PreviewRoot>
  <div className="min-h-screen bg-page p-6">
    <PageHeader eyebrow="Game guide" title="How scoring works" />
    <div className="mt-4 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-text-muted">Pick five drivers per session.</p>
      <Button variant="primary">Make your picks</Button>
    </div>
  </div>
</PreviewRoot>;
```

### Styling idiom: Tailwind utilities over semantic tokens

Style with Tailwind classes, but use **these** colour names rather than
Tailwind's default palette. Never write `bg-slate-900` or `text-gray-400`; the
equivalents below are the real system.

| Family                   | Classes                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Surfaces                 | `bg-page` (app background), `bg-surface`, `bg-surface-elevated`, `bg-surface-muted`, `bg-surface-hover` |
| Text                     | `text-text` (primary), `text-text-muted` (secondary)                                                    |
| Borders                  | `border-border`, `border-border-strong`                                                                 |
| Accent (teal)            | `bg-accent`, `bg-accent-muted`, `text-accent`, `text-accent-hover`, `border-accent`                     |
| Primary action (crimson) | `bg-button-accent`, `bg-racing-red`, `text-racing-red`, `text-racing-amber`                             |
| Status                   | `text-error`, `text-success`, `text-warning` and `bg-*`/`bg-*-muted` pairs                              |
| Podium                   | `text-podium-gold`, `text-podium-silver`, `text-podium-bronze`                                          |
| Sprint sessions          | `bg-sprint`, `text-sprint-text`, `border-sprint-border`                                                 |
| Radii                    | `rounded-md` `rounded-lg` `rounded-xl` `rounded-2xl`                                                    |
| Display font             | `font-title` (Orbitron: headings, numerals, race data)                                                  |

Spacing, flex/grid, and the `text-xs … text-6xl` scale are stock Tailwind.

**The stylesheet is pre-compiled and fixed.** No Tailwind compiler runs here, so
`styles.css` contains only the utilities this app already uses. The common
surface (layout, spacing, sizing, the classes above) is present, but an exotic
or arbitrary-value class may resolve to nothing. Prefer the vocabulary above,
and if a class looks unusual, grep for it in the stylesheet before relying on
it. `rounded-pill` is a token but has no compiled class; use `rounded-full`.

### Where the truth lives

Read these before styling: `_ds/<folder>/styles.css` and the `@import`ed
`_ds_bundle.css` for the real class list, and
`components/<group>/<Name>/<Name>.prompt.md` plus `<Name>.d.ts` for a
component's actual props. Those files beat any summary here.

### Exports with no card of their own

Also on `window.GrandPrixPicks`, usable but without a preview card:
`StatusBadge`, `ScoredDriverBadge`, `DriverBadgeSkeleton`,
`LeagueMembersListSkeleton`, `FeedItemSkeleton`, `FeedEmptyState`,
`SessionGroup`, and the three loading affordances `InlineLoader` (inside an
already-rendered page), `PageLoader` (route level), and `RaceCardSkeleton`
(where the shape is known). Choosing between a skeleton and a spinner is the
design decision: skeleton when the shape is known, spinner when it is not.

### One known gap

`Flag` renders nothing visible. It loads country SVGs from a same-origin
`/flags/` path that does not exist outside the app, so it occupies its box and
draws no image. Do not rely on it for visual weight; prefer a country code in
text where the flag would carry meaning.
