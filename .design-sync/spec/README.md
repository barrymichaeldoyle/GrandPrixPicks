# Claude Design sync

There are **two** Claude Design projects for this app. They do different jobs
and must not be pointed at each other.

| Project                            | ID                                     | Role                                                            | Direction     |
| ---------------------------------- | -------------------------------------- | --------------------------------------------------------------- | ------------- |
| **Grand Prix Picks Design System** | `207819bf-d2c7-45dc-945c-24ccdb151049` | Hand-authored _Timing Sheet Minimal_ spec. The creative source. | Design → repo |
| **Grand Prix Picks**               | `b776086f-79e9-4e29-8780-625e42d689dc` | Storybook mirror of what the repo actually ships.               | repo → Design |

`../config.json` targets the **mirror**, and only the mirror.

## ⚠️ Never point `config.json` at the Design System project

`config.json` is `shape: "storybook"`. It builds the repo's stories and writes
`components/**`, `styles.css` and `fonts/**`. Aimed at `207819bf` it would
overwrite the hand-authored `components/core/*.jsx`, `tokens/*.css` and
`guidelines/*.card.html` on the first `write_files` — destroying the creative
source. The two IDs must stay where they are.

## `spec/tokens/` — the contract

A byte snapshot of the `tokens/` directory in the Design System project. It is
the machine-checkable half of the design contract: the foundations must match
exactly, while components are interpretations and are reviewed by eye.

```
node .design-sync/check-spec-drift.mjs
```

Reports which token values match, which drifted, and which departures are
deliberate. As of the last sync: **99/99 contract tokens match, with zero
divergences carried.**

Getting to zero meant editing the _spec_, not excusing the app. The spec was
missing things the product genuinely needs, so those were written back into the
Design project rather than logged as permanent exceptions:

| Was a divergence                | How it was closed                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `team-*`                        | Spec shipped 2025 sample teams. It now carries the real 2026 grid, and the app emits `--team-*` from the shared tokens so the two are directly comparable. |
| Stripe geometry                 | The spec's `transform: skewX(-12deg)` is genuinely broken on tall containers. It now specifies the `clip-path` and `--stripe-lean`.                        |
| `podium-*`                      | Spec had no podium colours. It now defines them as flat data colours, with the "a rank marker is a chip, not a medal" rule.                                |
| `sprint`                        | Spec had no sprint concept. It now aliases the violet result semantic rather than adding a sixth hue.                                                      |
| `error` / `warning` / `success` | The spec said "errors are amber, never red" in prose only. They are tokens now, so a status surface cannot reach for red.                                  |
| Type scale naming               | Not resolved by changing either side — instead **aliased** in the drift script, so the px equivalence is verified on every run rather than taken on trust. |

Two more things were fed back that are not tokens: the spec's global
`a { color: var(--accent) }` (which makes every leaderboard name glow and
drowns out the viewer's own row) is now `color: inherit` with an opt-in
`.link-accent`, and `.gpp-team-bar` / `.gpp-team-dot` / `.gpp-empty` are
defined in `base.css` instead of left for each consumer to reinvent.

## When you change the Design side

1. **Edit in Claude Design** (`207819bf`) as normal.
2. **Ask Claude to re-pull the snapshot.** It runs one `DesignSync get_file`
   per changed file in `tokens/` and rewrites `spec/tokens/`. The script cannot
   do this itself — `DesignSync` is an agent tool authenticated through the
   claude.ai login, not a CLI.
3. **Run the drift check.** It names exactly which values moved.
4. **Port them** into `packages/shared/src/tokens.ts` (never into `styles.css`
   — see the note at the top of that file) and regenerate:
   `pnpm --filter @grandprixpicks/shared generate-tokens`.
5. **Re-run the check** until only documented divergences remain.

For component-level changes (a new variant, a changed interaction state), read
the component's `.prompt.md` in the Design project — that is where the intent
is written down — and mirror it in the repo component of the same name.

## When you change the repo side

Run `/design-sync` as before. It refreshes the **mirror** (`b776086f`) from the
repo's Storybook. That project is currently stale: it still holds Orbitron and
the pre-redesign teal/red palette, so the first run after this redesign will be
a large diff. That is expected and correct.

## Prefer fixing the spec over recording a divergence

`check-spec-drift.mjs` has a `DIVERGENCES` list for departures that are genuine
decisions. **It is currently empty, and that is the goal state.**

When the app and the spec disagree, work through the options in this order:

1. **The spec is right** — port the value into
   `packages/shared/src/tokens.ts`.
2. **The app is right and the spec is incomplete or wrong** — write it back to
   the Design project. Most of the original six divergences were this: the spec
   was authored from a brief with no codebase attached, so it had 2025 sample
   teams, no podium, no sprint, and a stripe implementation that does not
   survive a tall container.
3. **Both are right, they just use different names** — add an entry to
   `ALIASES`, which keeps the values compared rather than skipped.
4. **Only then**, record a `DIVERGENCES` entry with the reason.

A divergence is skipped from comparison entirely, so every one is a small
permanent blind spot. Options 1–3 all keep the check honest.
