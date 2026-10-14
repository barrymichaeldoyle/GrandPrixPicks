# Cloud news environment validation — 2026-10-14

Code: `claude/news-routine-setup` @ 8c195e4. Nothing published, scheduled, deployed or pushed to main.

## Environment
- node v22.22.0; pnpm 12.4.1; @bufferapp/cli 2.0.1; `pnpm install --frozen-lockfile` exit 0
- HTTP_PROXY: absent. HTTPS_PROXY: present. NODE_USE_ENV_PROXY: absent
- GPP_CONVEX_PROXY_URL and BUFFER_API_KEY: set

## Results
| Check | Result | Detail |
|---|---|---|
| Dependencies | PASS | Tools present, frozen install succeeded |
| Production Convex authentication | PASS | `pnpm gpp race --prod` returned usa-2026 (R18, upcoming, race Sun 25 Oct 20:00Z) |
| Buffer authentication | FAIL | curl GraphQL `account { id }` returned HTTP 200 with an account id. Buffer CLI under `preflight.sh` failed: `AUTH_ERROR code 4 "Access token is not valid"`. With `NODE_USE_ENV_PROXY=1` the CLI succeeded and listed the GrandPrixPicks X channel (6a6f4b8a99afb44349e9c0f4, Africa/Johannesburg) and an Instagram channel |
| Source fetch | PASS | formula1.com/en/latest/all, 301 then 200, 318650 bytes ("Latest F1 News") |
| Authoritative ledger recovery | PASS | `claude/news-social-state` opened with apply:true: 35 posts, SHA256 8fa50b1477bb6de7f95e34609722e2fa4705598b050ffa1973cc6fa0b8fe4c8d |
| Exclusive locking | PASS | Second apply:true opener rejected: "Another operator holds the shared news lock." |
| Persistence | PASS | `save(writer.ledger)` succeeded as a child commit; a fresh read-only helper gave 35 posts and the identical digest |
| Lock release | PASS | Writer closed in finally; the fetched lock branch's owner.json has owner:null |

## preflight.sh
Exit code 4. The Convex step passed and the Buffer CLI step failed, so the script stopped before `pnpm gpp news social check --prod`. The ledger was checked directly with the state helper instead (above).

## Cause and fix
The Buffer CLI makes its API calls with Node's fetch, which ignores HTTPS_PROXY unless `NODE_USE_ENV_PROXY=1` is set. Without the proxy the request skips the cloud network secret, so Buffer rejects the placeholder key. Setting `NODE_USE_ENV_PROXY=1` in the cloud environment (or at the top of `preflight.sh`) should fix it. I did not change credentials, the environment or the routine, and I did not inspect the CLI source.

## Overall: FAIL
Everything passes except the Buffer CLI as configured (preflight.sh exit 4). The routine is not ready until NODE_USE_ENV_PROXY=1 is set.
