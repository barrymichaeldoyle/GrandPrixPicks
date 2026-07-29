# Claude Design sync

There are **two** Claude Design projects for this app. They do different jobs
and must not be pointed at each other.

| Project | ID | Role | Direction |
|---|---|---|---|
| **Grand Prix Picks Design System** | `207819bf-d2c7-45dc-945c-24ccdb151049` | Hand-authored *Timing Sheet Minimal* spec. The creative source. | Design → repo |
| **Grand Prix Picks** | `b776086f-79e9-4e29-8780-625e42d689dc` | Storybook mirror of what the repo actually ships. | repo → Design |

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
deliberate. As of the last sync: **63/63 contract tokens match**, with 6
documented divergences listed in the script.

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

## Divergences are decisions, not drift

The `DIVERGENCES` list in `check-spec-drift.mjs` records where the repo
deliberately departs from the spec **and why** — the 2026 grid vs the spec's
2025 sample teams, the stripe's clip-path, podium colours, sprint mapping.
Without it every re-sync re-argues the same points. If you change your mind on
one, delete the entry and port the spec value.
