#!/usr/bin/env node

/**
 * PreToolUse hook (Bash): send prod `convex run` calls through `gpp run`.
 *
 * Convex reports every prod ArgumentValidationError to Sentry, and most of
 * the ones there have been agents guessing arguments in a raw
 * `npx convex run --prod` (an extra `limit`, a missing `now`, an ISO date
 * where epoch ms go). `scripts/gpp.mjs run` checks the args against the live
 * function spec first, so a bad call fails here and never reaches prod.
 *
 * Dev calls pass: they do not reach Sentry. Exit 2 blocks the call and shows
 * stderr to the agent.
 */

import { readFileSync } from 'node:fs';

/**
 * The command with quoted strings and heredoc bodies removed, so a grep or
 * sed whose pattern mentions `convex run --prod` is not mistaken for a call.
 * A real call keeps `convex run` and its flags outside quotes.
 */
function unquoted(command) {
  const heredoc = command.search(/<<-?\s*['"]?\w+['"]?/);
  const head =
    heredoc === -1
      ? command
      : command.slice(0, command.indexOf('\n', heredoc) + 1 || undefined);
  return head.replace(/'[^']*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
}

export function isRawProdConvexRun(rawCommand) {
  const command = unquoted(rawCommand);
  // `convex run` as a command, however it is launched: npx, pnpm exec,
  // node_modules/.bin/convex, pnpm --filter ... convex.
  if (!/(^|[\s;&|(/])convex\s+run\b/.test(command)) {
    return false;
  }
  return (
    /(^|\s)--prod\b/.test(command) ||
    /(^|\s)--url\b/.test(command) ||
    /(^|\s)--admin-key\b/.test(command) ||
    /(^|\s)--deployment[\s=]+['"]?prod\b/.test(command) ||
    /\bCONVEX_DEPLOY_KEY=/.test(command)
  );
}

const MESSAGE = `Raw prod \`convex run\` is blocked here. Use:

  scripts/gpp.mjs run <module:function> '<json args>' --prod

It checks the args against the live function spec before anything reaches prod
(a bad call there lands in Sentry). Queries run straight away; mutations and
actions print what they would do until you add --apply. For news, prefer
\`scripts/gpp.mjs news ...\` (docs/gpp-cli.md).`;

if (import.meta.url === `file://${process.argv[1]}`) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  const command = input?.tool_input?.command;
  if (typeof command === 'string' && isRawProdConvexRun(command)) {
    console.error(MESSAGE);
    process.exit(2);
  }
}
