# Cloud validation — 14 October 2026

Operator commit: `b3bcf21` (`claude/news-routine-setup`). Node v22.22.0.
HTTP_PROXY: absent. HTTPS_PROXY: present. NODE_USE_ENV_PROXY: absent (set per command only).
pnpm 12.4.1 and @bufferapp/cli 2.0.1 were already installed; `pnpm install --frozen-lockfile` completed.

| Check                            | Result | Detail                                                                                                                                                                                                   |
| -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencies                     | PASS   | Node, pnpm 12.4.1, Buffer CLI 2.0.1, Convex binary present                                                                                                                                               |
| Production Convex authentication | PASS   | `pnpm gpp race --prod` returned usa-2026 (R18, upcoming)                                                                                                                                                 |
| Buffer authentication            | PASS   | curl GraphQL `account { id }` returned HTTP 200 with an account id (not printed). Preflight CLI channels list passed; GrandPrixPicks X channel `6a6f4b8a99afb44349e9c0f4` present. Preflight exit code 0 |
| Source fetch                     | PASS   | formula1.com/en/latest/all and fia.com/news both HTTP 200                                                                                                                                                |
| Authoritative ledger recovery    | PASS   | `news social check --prod` read the shared ledger: 35 posts, SHA256 `8fa50b14…fe4c8d`                                                                                                                    |
| Exclusive locking                | PASS   | Second `apply:true` opener rejected: "Another operator holds the shared news lock."                                                                                                                      |
| Persistence                      | PASS   | Unchanged `save()` succeeded; fresh read-only reopen matched 35 posts and identical digest                                                                                                               |
| Lock release                     | PASS   | Lock branch `owner.json` is `{"owner":null}` after close; lock history has 6 commits, no branches deleted                                                                                                |

The Buffer CLI fallback retry with NODE_USE_ENV_PROXY=1 was not needed; the preflight sets it itself.
No posts were added, no journal reset, nothing published or scheduled.

## Overall: PASS
