#!/usr/bin/env node

/**
 * gpp: operator CLI for Grand Prix Picks, built for agents first.
 *
 * Every command prints the fewest lines that answer the question, and takes
 * `--json` for the full return value. Writes rehearse by default and need
 * `--apply`, so the safe call is the short one. See `docs/gpp-cli.md`.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const backendDir = path.join(repoRoot, 'apps/backend');

const HELP = `gpp <command> [args] [--prod] [--json]

  race [slug]                     weekend at a glance (default: current weekend)
  news list <slug>                one line per item, retracted included
  news show <slug> <key>          one item in full
  news publish <file.json>        dry run; --apply to publish (object or array, run in order)
  news retract <slug> <key>       shows the item; --apply to retract
  news move <from> <to> <key>...  dry run; --apply to move
  page <url|/path>                SSR text of a page (/path = localhost:3000, --prod = live)
                                  --grep <regex>  only matching lines   --full  no truncation
  usage [--days N]                tool-output cost of recent Claude Code sessions here

Flags: --prod targets production Convex. --json prints the raw result.
In publish files, sourcePublishedAt and feedVisibleAt may be ISO dates.`;

// ---------------------------------------------------------------------------
// args

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      continue;
    }
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (['grep', 'days'].includes(name) && next !== undefined) {
        flags[name] = next;
        i++;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function fail(message) {
  console.error(`gpp: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// convex

function convexRun(fn, args, { prod }) {
  // The backend's own convex binary, run from its directory so it picks up
  // apps/backend/.env.local, the same as `pnpm dev:backend`.
  const result = spawnSync(
    path.join(backendDir, 'node_modules/.bin/convex'),
    [
      'run',
      fn,
      JSON.stringify(args),
      '--typecheck',
      'disable',
      '--codegen',
      'disable',
      ...(prod ? ['--prod'] : []),
    ],
    { cwd: backendDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    const raw = `${result.stderr}\n${result.stdout}`;
    if (/Could not find (public )?function/i.test(raw)) {
      fail(
        `${fn} is not on ${prod ? 'prod' : 'dev'} yet. A push to main deploys it` +
          (prod ? '.' : '; for dev, keep `pnpm dev:backend` running.'),
      );
    }
    // Keep the message, drop the validator dump and stack frames.
    const lines = raw
      .split('\n')
      .map((line) => line.trimEnd())
      .filter(
        (line) =>
          line &&
          !/^\s+at /.test(line) &&
          !/^(Validator|Object):/.test(line) &&
          !line.startsWith('✖ Failed to run'),
      )
      .map((line) =>
        line.replace(/^Error: \[Request ID: \w+\] Server Error$/, ''),
      )
      .filter(Boolean);
    fail(
      `${fn} failed${prod ? ' on prod' : ''}:\n${lines.slice(0, 6).join('\n')}`,
    );
  }
  const out = result.stdout.trim();
  if (!out) {
    return null;
  }
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

// ---------------------------------------------------------------------------
// formatting

const DAY = 24 * 60 * 60 * 1000;

function when(ms) {
  if (ms == null) {
    return '-';
  }
  const d = new Date(ms);
  const stamp = d
    .toUTCString()
    .replace(/^(\w+), (\d+) (\w+) \d+ (\d+:\d+):\d+ GMT$/, '$1 $2 $3 $4Z');
  return `${stamp} (${relative(ms)})`;
}

function relative(ms) {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const text =
    abs >= DAY
      ? `${Math.round(abs / DAY)}d`
      : abs >= 3600_000
        ? `${Math.round(abs / 3600_000)}h`
        : `${Math.max(1, Math.round(abs / 60_000))}m`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

function day(ms) {
  return ms == null ? '-' : new Date(ms).toISOString().slice(0, 10);
}

function pad(value, width) {
  const s = String(value);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

// ---------------------------------------------------------------------------
// race

function raceCommand(slug, flags) {
  const state = convexRun(
    'ops:raceState',
    slug ? { raceSlug: slug } : {},
    flags,
  );
  if (flags.json) {
    return console.log(JSON.stringify(state, null, 2));
  }
  if (!state) {
    fail(slug ? `no race "${slug}"` : 'no current or upcoming race');
  }

  console.log(
    `${state.slug}  ${state.name} · R${state.round} · ${state.status}` +
      `${state.hasSprint ? ' · sprint' : ''} · start ${when(state.raceStartAt)}`,
  );
  console.log(
    `${pad('session', 13)}${pad('lock', 30)}${pad('top5', 6)}${pad('h2h', 5)}result`,
  );
  for (const s of state.sessions) {
    let result = '-';
    if (s.result) {
      const r = s.result;
      const bits = [
        `${r.scoringStatus ?? 'published'} ${day(r.publishedAt)}`,
        `scored ${r.scored}`,
      ];
      if (r.amendedAt) {
        bits.push(`amended ${day(r.amendedAt)}`);
      }
      if (r.nextRecheckAt) {
        bits.push(`recheck ${relative(r.nextRecheckAt)}`);
      }
      if (r.lastRecheckError) {
        bits.push(`ERR ${r.lastRecheckError.slice(0, 60)}`);
      }
      result = bits.join(' · ');
    }
    console.log(
      `${pad(s.session, 13)}${pad(when(s.lockAt), 30)}${pad(s.top5Pickers, 6)}${pad(s.h2hPickers, 5)}${result}`,
    );
  }
  const n = state.news;
  console.log(
    `news: ${n.active} active, ${n.retracted} retracted, ${n.held} held for feed`,
  );
}

// ---------------------------------------------------------------------------
// news

function newsRow(item) {
  const mark = item.active ? '✓' : '✗';
  const cat =
    item.category === 'general'
      ? 'general'
      : `pick[${item.affectsSessions.join(',')}]`;
  const extras = [];
  if (item.driverCodes.length) {
    extras.push(item.driverCodes.join(','));
  }
  if (!item.feedSelected) {
    extras.push('no-feed');
  } else if (item.feedVisibleAt && item.feedVisibleAt > Date.now()) {
    extras.push(`feed ${relative(item.feedVisibleAt)}`);
  }
  if (!item.writeUpSelected) {
    extras.push('no-writeup');
  }
  if (item.gridRows) {
    extras.push(`grid ${item.gridRows}`);
  }
  if (item.hasImage) {
    extras.push('img');
  }
  extras.push(`${item.sourceName} ${day(item.sourcePublishedAt)}`);
  return `${mark} ${item.key}  ${cat}  ${extras.join(' · ')}\n    ${item.headline}`;
}

function newsList(slug, flags) {
  if (!slug) {
    fail('news list <slug>');
  }
  const res = convexRun('ops:newsList', { raceSlug: slug }, flags);
  if (flags.json) {
    return console.log(JSON.stringify(res, null, 2));
  }
  if (!res) {
    fail(`no race "${slug}"`);
  }
  const active = res.items.filter((i) => i.active).length;
  console.log(
    `${res.race.slug} · ${res.race.name} · ${active} active, ${res.items.length - active} retracted`,
  );
  for (const item of res.items) {
    console.log(newsRow(item));
  }
}

function newsShow(slug, key, flags) {
  if (!slug || !key) {
    fail('news show <slug> <key>');
  }
  const res = convexRun('ops:newsList', { raceSlug: slug, key }, flags);
  if (!res) {
    fail(`no race "${slug}"`);
  }
  if (!res.item) {
    fail(`no item "${key}" on ${slug}`);
  }
  // Ids mean nothing to a reader of one item; --json keeps them.
  const {
    _id,
    _creationTime,
    raceId: _raceId,
    feedReleaseScheduledId: _release,
    ...item
  } = res.item;
  if (flags.json) {
    return console.log(JSON.stringify(res.item, null, 2));
  }
  console.log(JSON.stringify(item, null, 2));
}

const WOULD = {
  created: 'create',
  updated: 'update',
  republished: 'republish',
};

const DATE_FIELDS = ['sourcePublishedAt', 'feedVisibleAt'];

function toEpoch(value, field, key) {
  if (value === undefined || typeof value === 'number') {
    return value;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    fail(`${key}: ${field} "${value}" is not a date`);
  }
  return ms;
}

function newsPublish(file, flags) {
  if (!file) {
    fail('news publish <file.json>');
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
  } catch (error) {
    fail(`cannot read ${file}: ${error.message}`);
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const apply = Boolean(flags.apply);
  for (const raw of items) {
    const { dryRun: _ignored, ...item } = raw;
    for (const field of DATE_FIELDS) {
      if (item[field] !== undefined) {
        item[field] = toEpoch(item[field], field, item.key);
      }
    }
    const res = convexRun(
      'raceNews:publish',
      { ...item, ...(apply ? {} : { dryRun: true }) },
      flags,
    );
    if (flags.json) {
      console.log(JSON.stringify(res, null, 2));
      continue;
    }
    const bits = [
      apply ? res.action : `would ${WOULD[res.action] ?? res.action}`,
      `${res.race.slug}/${res.key}`,
      `[${res.affectsSessions.join(',') || 'general'}]`,
    ];
    if (res.driverCodes?.length) {
      bits.push(res.driverCodes.join(','));
    }
    bits.push(`source ${res.sourcePublished ?? 'undated'}`);
    if (res.feedVisibleAt) {
      bits.push(`feed held until ${when(res.feedVisibleAt)}`);
    }
    if (res.gridPositions) {
      bits.push(`grid ${res.gridPositions} (${res.gridNewsLinks ?? 0} linked)`);
    }
    console.log(bits.join('  '));
    if (res.missingNewsKeys?.length) {
      console.log(`  MISSING newsKeys: ${JSON.stringify(res.missingNewsKeys)}`);
    }
  }
  if (!apply) {
    console.log('dry run. Re-run with --apply to publish.');
  }
}

function newsRetract(slug, key, flags) {
  if (!slug || !key) {
    fail('news retract <slug> <key>');
  }
  if (!flags.apply) {
    const res = convexRun('ops:newsList', { raceSlug: slug, key }, flags);
    if (!res?.item) {
      fail(`no item "${key}" on ${slug}`);
    }
    console.log(
      `would retract ${slug}/${key} (${res.item.active ? 'active' : 'already retracted'})`,
    );
    console.log(`    ${res.item.headline}`);
    console.log('Re-run with --apply to retract. This removes its feed card.');
    return;
  }
  const res = convexRun('raceNews:retract', { raceSlug: slug, key }, flags);
  if (flags.json) {
    return console.log(JSON.stringify(res, null, 2));
  }
  console.log(
    `${res.action} ${slug}/${res.key}${res.headline ? `  ${res.headline}` : ''}`,
  );
}

function newsMove(from, to, keys, flags) {
  if (!from || !to || keys.length === 0) {
    fail('news move <from> <to> <key>...');
  }
  const res = convexRun(
    'raceNews:move',
    {
      fromRaceSlug: from,
      toRaceSlug: to,
      keys,
      ...(flags.apply ? {} : { dryRun: true }),
    },
    flags,
  );
  if (flags.json) {
    return console.log(JSON.stringify(res, null, 2));
  }
  console.log(
    `${res.action === 'dry_run' ? 'would move' : 'moved'} ${res.from} → ${res.to}`,
  );
  for (const item of res.items) {
    console.log(
      `  ${item.active ? '✓' : '✗'} ${item.key}${item.feedEvent ? ' (+feed card)' : ''}  ${item.headline}`,
    );
  }
  if (!flags.apply) {
    console.log('dry run. Re-run with --apply to move.');
  }
}

// ---------------------------------------------------------------------------
// page

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

function decode(text) {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, name) => {
    if (name[0] === '#') {
      const code =
        name[1] === 'x' || name[1] === 'X'
          ? parseInt(name.slice(2), 16)
          : Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[name.toLowerCase()] ?? m;
  });
}

function textOf(html) {
  return decode(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

async function pageCommand(target, flags) {
  if (!target) {
    fail('page <url|/path>');
  }
  const url = /^https?:\/\//.test(target)
    ? target
    : `${flags.prod ? 'https://grandprixpicks.com' : 'http://localhost:3000'}${target.startsWith('/') ? '' : '/'}${target}`;
  let response;
  try {
    response = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'gpp-cli' },
    });
  } catch (error) {
    fail(
      `${url}: ${error.cause?.code ?? error.message}${url.includes('localhost') ? ' (is `pnpm dev` running?)' : ''}`,
    );
  }
  const location = response.headers.get('location');
  console.log(`${response.status} ${url}${location ? ` → ${location}` : ''}`);
  if (location) {
    return;
  }
  const html = await response.text();

  function attr(re) {
    return decode(html.match(re)?.[1] ?? '');
  }
  const head = {
    title: textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    description: attr(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
    canonical: attr(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i),
    robots: attr(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i),
  };
  for (const [k, value] of Object.entries(head)) {
    if (value) {
      console.log(`${k}: ${value}`);
    }
  }

  const main =
    html.match(/<main[\s\S]*<\/main>/i)?.[0] ??
    html.match(/<body[\s\S]*<\/body>/i)?.[0] ??
    html;
  const cleaned = main
    .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const lines = [];
  const blockRe =
    /<(h[1-6]|p|li|td|th|dt|dd|figcaption|blockquote|button|a|label|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  // Headings and block text in document order, one line each.
  for (const m of cleaned.matchAll(blockRe)) {
    const text = textOf(m[2]);
    if (!text) {
      continue;
    }
    const tag = m[1].toLowerCase();
    const prefix = /^h[1-6]$/.test(tag)
      ? `${'#'.repeat(Number(tag[1]))} `
      : tag === 'li'
        ? '- '
        : tag === 'a' || tag === 'button'
          ? `[${tag}] `
          : '';
    const line = prefix + text;
    if (lines[lines.length - 1] !== line) {
      lines.push(line);
    }
  }
  let output = lines;
  if (typeof flags.grep === 'string') {
    const re = new RegExp(flags.grep, 'i');
    output = lines.filter((line) => re.test(line));
  }
  const body = output.join('\n');
  const limit = flags.full ? Infinity : 4000;
  console.log(
    body.length > limit
      ? `${body.slice(0, limit)}\n… ${body.length - limit} more chars (--full, or --grep)`
      : body,
  );
}

// ---------------------------------------------------------------------------
// usage

function resultLength(content) {
  if (typeof content === 'string') {
    return content.length;
  }
  if (!Array.isArray(content)) {
    return 0;
  }
  return content.reduce(
    (n, b) => n + (b?.type === 'text' ? (b.text?.length ?? 0) : 0),
    0,
  );
}

function usageKey(name, input) {
  if (name !== 'Bash') {
    if (name === 'Read') {
      return 'Read';
    }
    if (name === 'WebFetch') {
      return `WebFetch ${input.url?.match(/https?:\/\/([^/]+)/)?.[1] ?? '?'}`;
    }
    return name;
  }
  const cmd = (input.command ?? '').trim().replace(/^cd [^&;]+(&&|;)\s*/, '');
  const convex = cmd.match(/convex (run|data)((?:\s+--\S+)*)\s+([\w:/.]+)/);
  if (convex) {
    return `convex ${convex[1]} ${convex[3]}${cmd.includes('--prod') ? ' --prod' : ''}`;
  }
  const gpp = cmd.match(
    /gpp(?:\.mjs)?\s+(\w+(?:\s+(?:list|show|publish|retract|move))?)/,
  );
  if (gpp) {
    return `gpp ${gpp[1]}`;
  }
  const pnpm = cmd.match(/^pnpm (?:--filter \S+ |-F \S+ )?(?:run )?([\w:.-]+)/);
  if (pnpm) {
    return `pnpm ${pnpm[1]}`;
  }
  const git = cmd.match(/^git (\w+)/);
  if (git) {
    return `git ${git[1]}`;
  }
  return cmd.split(/\s+/)[0]?.slice(0, 30) || '?';
}

function usageCommand(flags) {
  const days = Number(flags.days ?? 30);
  const dir = path.join(
    homedir(),
    '.claude/projects',
    repoRoot.replace(/[/.]/g, '-'),
  );
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
  } catch {
    fail(`no transcripts at ${dir}`);
  }
  const since = Date.now() - days * DAY;
  const calls = new Map();
  const sizes = new Map();
  let sessions = 0;
  let screenshots = 0;
  for (const file of files) {
    const full = path.join(dir, file);
    if (statSync(full).mtimeMs < since) {
      continue;
    }
    sessions++;
    for (const line of readFileSync(full, 'utf8').split('\n')) {
      if (!line.includes('tool_')) {
        continue;
      }
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      const content = entry.message?.content;
      if (!Array.isArray(content)) {
        continue;
      }
      for (const block of content) {
        if (block?.type === 'tool_use') {
          calls.set(block.id, {
            key: usageKey(block.name, block.input ?? {}),
            session: file,
          });
          if (
            /screenshot/.test(block.name) ||
            block.input?.action === 'screenshot'
          ) {
            screenshots++;
          }
        } else if (block?.type === 'tool_result') {
          sizes.set(block.tool_use_id, resultLength(block.content));
        }
      }
    }
  }
  const agg = new Map();
  let total = 0;
  for (const [id, { key, session }] of calls) {
    const size = sizes.get(id) ?? 0;
    total += size;
    const a = agg.get(key) ?? { calls: 0, chars: 0, sessions: new Set() };
    a.calls++;
    a.chars += size;
    a.sessions.add(session);
    agg.set(key, a);
  }
  const rows = [...agg.entries()].sort((a, b) => b[1].chars - a[1].chars);
  if (flags.json) {
    return console.log(
      JSON.stringify(
        rows.map(([key, a]) => ({
          key,
          calls: a.calls,
          sessions: a.sessions.size,
          chars: a.chars,
        })),
        null,
        2,
      ),
    );
  }
  console.log(
    `${sessions} sessions, last ${days}d · ${calls.size} tool calls · ${total.toLocaleString()} chars of output (~${Math.round(total / 4).toLocaleString()} tokens) · ${screenshots} screenshots (not counted)`,
  );
  console.log(`${pad('call', 52)}${pad('calls', 7)}${pad('sess', 6)}chars`);
  for (const [key, a] of rows.slice(0, 30)) {
    console.log(
      `${pad(key.slice(0, 50), 52)}${pad(a.calls, 7)}${pad(a.sessions.size, 6)}${a.chars.toLocaleString()}`,
    );
  }
}

// ---------------------------------------------------------------------------

const { positional, flags } = parseArgs(process.argv.slice(2));
const [command, sub, ...rest] = positional;

switch (command) {
  case 'race':
    raceCommand(sub, flags);
    break;
  case 'news':
    if (sub === 'list') {
      newsList(rest[0], flags);
    } else if (sub === 'show') {
      newsShow(rest[0], rest[1], flags);
    } else if (sub === 'publish') {
      newsPublish(rest[0], flags);
    } else if (sub === 'retract') {
      newsRetract(rest[0], rest[1], flags);
    } else if (sub === 'move') {
      newsMove(rest[0], rest[1], rest.slice(2), flags);
    } else {
      fail('news list|show|publish|retract|move');
    }
    break;
  case 'page':
    await pageCommand(sub, flags);
    break;
  case 'usage':
    usageCommand(flags);
    break;
  case undefined:
  case 'help':
    console.log(HELP);
    break;
  default:
    fail(`unknown command "${command}"\n\n${HELP}`);
}
