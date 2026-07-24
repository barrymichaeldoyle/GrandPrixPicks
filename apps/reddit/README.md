# Grand Prix Picks for Reddit

Devvit Web prototype for the subreddit-scoped Grand Prix Picks game.

## Prototype scope

- Moderator-created Hungarian Grand Prix post
- Qualifying and race session tabs
- Exactly five unique Top 5 picks
- Reddit-authenticated, installation-local Redis storage
- Revisions before a server-authoritative lock
- Responsive inline launch screen and expanded picker

H2H, scoring publication, and leaderboards follow in the next beta slice.

## Local setup

The `name` in `devvit.json` must match an app registered to the developer
account. Register or rename the app in the Reddit developer portal before the
first playtest.

```sh
pnpm install
pnpm --filter @grandprixpicks/reddit login
pnpm --filter @grandprixpicks/reddit dev
```

Use the subreddit menu action **Create Grand Prix Picks post** as a moderator.
The action is idempotent for the bundled race.
