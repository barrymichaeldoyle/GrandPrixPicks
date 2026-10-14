# Cloud validation — 14 October 2026 (second run)

Code branch: `claude/news-routine-setup` @ b5ad491. Routine not changed.

| Check | Result | Detail |
| --- | --- | --- |
| Dependencies | PASS | Node 22.22.0, pnpm 12.4.1, @bufferapp/cli 2.0.1 present. `node_modules` was missing; `pnpm install --frozen-lockfile` fixed it. Convex CLI present. |
| Production Convex authentication | PASS | `pnpm gpp race --prod` returned usa-2026 (R18, upcoming). |
| Buffer authentication | FAIL | `buffer channels list` and `pnpm gpp news social check --prod`: `{"error":"AUTH_ERROR","code":4,"message":"Access token is not valid"}`. GrandPrixPicks X channel not confirmed. |
| Source fetch | PASS | fia.com/news HTTP 200 (formula1.com/en/latest/all returned 301). |
| Authoritative ledger recovery | PASS | Read `claude/news-social-state`: 35 posts, SHA256 of JSON.stringify(ledger) `8fa50b1477bb6de7f95e34609722e2fa4705598b050ffa1973cc6fa0b8fe4c8d`. |
| Exclusive locking | PASS | Second `apply:true` opener rejected: "Another operator holds the shared news lock." |
| Persistence | PASS | `save(writer.ledger)` succeeded as a child commit (state head a14a79c → 6c33cdf, no force push). A fresh read-only helper saw 35 posts and the identical digest. |
| Lock release | FAIL | `close()` threw "Could not release shared news lock." `refs/heads/claude/news-social-state-lock` still exists at 652e74ea80279fb49a3fd2ae4b2dc4267de2c4b0. This run created it. A manual `git push origin :refs/heads/claude/news-social-state-lock` was denied by the sandbox permission classifier, so it was not retried or worked around. |

## Consequence

The stale lock blocks every future `apply` until someone deletes it. The branch deletion in `close()` appears to be refused in this cloud environment, so the lock would be orphaned on every run. This needs a fix in the environment's git permissions or in the lock release mechanism.

## Overall: FAIL

Buffer credentials are rejected and the lock cannot be released from the cloud environment.
