# Contributing to Grand Prix Picks

Thanks for your interest. Before you open an issue or a pull request, please
read this page in full. It is short, and the first rule is a hard requirement.

## You must be a Grand Prix Picks player

**Issues and pull requests are only accepted from people with a Grand Prix
Picks account.** If you do not have one, sign up at
[grandprixpicks.com](https://grandprixpicks.com) and play a race weekend first.

Every issue and pull request must state your Grand Prix Picks **username** (the
one at `grandprixpicks.com/p/<username>`) in the template field provided.

- No username given: the issue or PR is closed without review.
- Username given but no matching account: closed without review.
- Username belongs to somebody else: closed, and the account may be suspended.

This is not gatekeeping for its own sake. This is a live game with real
standings and real money moving through it, and the people best placed to
report a bug or propose a change are the people who actually play it. Reports
from players come with context we can reproduce; reports from drive-by
contributors usually do not.

If you want to report something but would rather not have it in public, use the
in-app support form at
[grandprixpicks.com/support](https://grandprixpicks.com/support). That is
account-linked already, so no username field is needed.

## Licensing, before you write any code

This repository is **source-available, not open source**. See
[LICENSE](./LICENSE). The code is published for transparency and reference. No
rights to use, copy, modify, or distribute it are granted by default.

Consequences for contributors:

- **Ask before you build.** Open an issue and get a written go-ahead from the
  maintainer before starting work on a pull request. Unsolicited PRs, however
  good, may be closed unmerged.
- By opening a pull request you assign copyright in your contribution to the
  copyright holder, and confirm the work is yours to give.
- Do not fork this repository to run your own version of the game.

## Opening an issue

Use the issue templates. Fill in the username field and every other required
field.

Good issues include:

- Your Grand Prix Picks username
- What you expected to happen and what actually happened
- The race weekend, session (quali / sprint quali / sprint / race) and, where
  relevant, the league involved
- Web or mobile, plus browser or device
- Screenshots if the problem is visual

Please search existing issues first. Duplicates get closed and pointed at the
original.

Security issues do **not** belong in a public issue. Email the maintainer
through [grandprixpicks.com/support](https://grandprixpicks.com/support) and
say it is a security report.

## Opening a pull request

1. Confirm you have an account and an agreed issue to work against.
2. Fill in the username field in the PR template.
3. Keep the PR to one change. Split unrelated work.
4. Run the checks below before you push.

```bash
pnpm install
pnpm lint          # oxlint
pnpm check         # oxfmt formatting check
pnpm typecheck     # TypeScript across shared, web, backend
pnpm test          # shared + backend + web
pnpm test:mobile   # only if you touched apps/mobile
```

Conventions worth knowing:

- Named exports only. Default exports are lint-banned outside routes and config.
- Use `pnpm lint:fix` and `pnpm format` rather than hand-formatting.
- Design tokens are authored in `packages/shared/src/tokens.ts`. Do not
  introduce off-token colours; a lint rule will block them.
- Convex code lives in `apps/backend/convex/`. `routeTree.gen.ts` and
  `_generated/` are generated. Never edit them.
- No em dashes in player-facing copy.

See [CLAUDE.md](./CLAUDE.md) and [docs/](./docs) for the fuller picture of the
codebase.

## What tends to get rejected

- Anything from a non-player, as above
- Dependency bumps and formatting-only churn with no user-visible reason
- Large refactors nobody asked for
- Features that change scoring, billing, or moderation behaviour without a prior
  agreed issue
- AI-generated PRs submitted without the author having read or run the code

## Code of conduct

Be civil. This is a hobby project attached to a real person's name. Abuse,
harassment, or spam gets you blocked from the repository and, where the account
is identifiable, removed from the game.
