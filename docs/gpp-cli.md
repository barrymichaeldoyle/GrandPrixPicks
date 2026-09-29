# gpp CLI

`scripts/gpp.mjs` (also `pnpm gpp`) is an operator CLI written for agents
first. Every command prints the fewest lines that answer its question, and
`--json` prints the full return value when the short form is not enough.

It exists because agent sessions were paying for whole documents to answer
one-line questions. A scan of 152 sessions (30 Aug to 29 Sep 2026) found
`raceNews:list --prod` was the single most-called Convex function (135 calls,
39 sessions, 318k characters of output), and that prod state checks were
spread across half a dozen `races:*`, `results:*` and `convex data` calls.

## Commands

```bash
scripts/gpp.mjs race [slug] [--prod]            # weekend at a glance
scripts/gpp.mjs news list <slug> [--prod]       # one line per item
scripts/gpp.mjs news show <slug> <key> [--prod] # one item in full
scripts/gpp.mjs news publish <file> [--prod] [--apply]
scripts/gpp.mjs news retract <slug> <key> [--prod] [--apply]
scripts/gpp.mjs news move <from> <to> <key>... [--prod] [--apply]
scripts/gpp.mjs page <url|/path> [--prod] [--grep re] [--full]
scripts/gpp.mjs schema [table...] [--full]
scripts/gpp.mjs usage [--days N]
```

- **Writes rehearse by default.** `publish` and `move` dry-run, and `retract`
  shows the item, until given `--apply`. The safe call is the short one.
- **`race`** with no slug shows the weekend players are on: the locked race
  inside its 72-hour grace window, otherwise the next upcoming one (the same
  rule as `races.getQuickPickRace`). Per session: lock time, Top 5 and H2H
  picker counts, and result status (scoring, amendments, next recheck, last
  recheck error).
- **`news publish`** reads a JSON file holding one item or an array. An array
  runs one item at a time in file order, so stories publish before the grid
  that links to them. `sourcePublishedAt` and `feedVisibleAt` take an ISO date
  as well as epoch ms. Editorial rules live in the `publish-race-news` skill.
- **`page`** fetches the server-rendered HTML and prints the head (title,
  description, canonical, robots) and the headings and text of `<main>`, one
  block per line. It answers "is the text there" without a screenshot, and
  shows exactly what a crawler or a signed-out visitor gets. It cannot judge
  layout: use a browser for that. `/path` means `http://localhost:3000` (the
  name Vite always answers, given its `--host ::`), and `--prod` means
  grandprixpicks.com.
- **`schema`** reads `apps/backend/convex/schema.ts` locally. With no table it
  prints every table and its index names, one line each; with tables, just
  their definitions, without comment lines unless given `--full`. `schema.ts`
  is over 1,200 lines and was read 94 times in the September scan, usually for
  one table.
- **`usage`** reads this repo's Claude Code transcripts and ranks tool calls by
  how much output they returned. Re-run it to see whether a change to the
  tooling moved anything. Screenshots are counted but not sized.

## How it talks to Convex

It runs `apps/backend/node_modules/.bin/convex run` from `apps/backend`, so
dev and prod credentials work as they do for `npx convex run`. The compact
views are internal queries in `apps/backend/convex/ops.ts`; writes call the
existing `raceNews:*` mutations unchanged.

`ops:*` reaches prod with the next push to `main`. Until then the CLI says so,
and the raw `npx convex run --prod raceNews:*` calls still work.

## Adding a command

Add one when `usage` shows the same question costing real output across
several sessions, not before. Keep the default output to what answers the
question, put the shape in an `ops.ts` internal query rather than trimming a
big result in the CLI, and make any write rehearse unless given `--apply`.
