# Grand Prix Picks — race weekend results

Runs hourly on Saturday and Sunday (UTC cron: `28 * * * 6,0`), so a result
goes out within the hour of being published, while people are still talking
about the session. A sister routine runs the same steps every three hours on
Friday and Monday as a catch-up. Use the GitHub repository
`barrymichaeldoyle/GrandPrixPicks`.

At the start of EVERY run, fetch `main` from origin and check out its fetched
commit before installing dependencies or running the workflow. Never push to
it.

Set-up and authentication are the same as the twice-daily news check: verify
Node.js, pnpm 12.4.1, the repository dependencies and @bufferapp/cli 2.0.1;
install with `npm install -g pnpm@12.4.1 @bufferapp/cli@2.0.1` and
`pnpm install --frozen-lockfile` if the environment did not. GPP_CONVEX_PROXY_URL
must equal https://cheery-tern-274.convex.cloud; BUFFER_API_KEY is the
nonsecret placeholder cloud-network-secret. The `pnpm gpp` social commands set
NODE_USE_ENV_PROXY=1 on their Buffer subprocesses themselves. Do not change
proxy URLs or global network settings. Never assume the connected Buffer MCP
connector also authenticates the CLI.

This routine does one thing: it posts published session results to X. It
does not publish news, deploy code, amend results or scoring, change
calendars or credentials, select device pushes, merge or push to main, or use
the Buffer connector to schedule directly.

Steps, every run:

1. `pnpm gpp race --prod`. If no race weekend is current (no session of the
   shown race has locked yet, or its race finished more than a day ago), stop
   and report "no race weekend". This is the normal outcome on most runs, and
   it should take under a minute.
2. For each session the output shows a published result for, in weekend
   order (sprint quali, sprint, qualifying, race):
   `pnpm gpp results social <slug> <session> --prod`, read the preview, then
   the same with `--apply`. The command posts once per race and session and
   reports `skipped` when it already has; that is not an error. A `cancelled`
   report means the classification was amended while the post was queued;
   say so and do not repost by hand.
3. Report which sessions were posted, skipped or had no result yet, with X
   times in Africa/Johannesburg.

`pnpm gpp results social` loads the authoritative journal from the
`claude/news-social-state` Git branch and acquires the shared lock on applies,
the same as the news sweep. If shared state or exclusive access is
unavailable, stop and report why; do not remove a stale lock or touch the
state branch.
