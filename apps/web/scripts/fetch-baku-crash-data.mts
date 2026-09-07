/**
 * Pulls every Baku session OpenF1 holds and writes the raw payloads to
 * `artifacts/baku-crash-map/raw/`, plus a derived candidate incident list.
 *
 * This is a research script, not part of any build. Baku's archive changes once
 * a year, after the race, so the output is fetched deliberately and read by a
 * human rather than polled. Nothing on the site calls OpenF1 at runtime for
 * this feature, and it must stay that way: OpenF1 has blocked a deploy before
 * by 401ing during a live session.
 *
 * Run: pnpm --filter @grandprixpicks/web fetch-baku-crashes
 *
 * Stage 1 (this script) is metadata, race control and results, which is small
 * and cheap. Telemetry windows for incidents that race control does not locate
 * are stage 2, driven off the candidate list this produces, because fetching
 * location data blind would be tens of megabytes.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const API = 'https://api.openf1.org/v1';
const OUT = join(process.cwd(), '../../artifacts/baku-crash-map');
const CIRCUIT = 'Baku';

/**
 * OpenF1 is a free community API and it rate-limits. 350ms between calls was
 * not enough: it 429s partway through the fifteen sessions. Space them out and
 * back off when it complains.
 */
const POLITE_DELAY_MS = 1200;
const MAX_ATTEMPTS = 5;
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  year: number;
  date_start: string;
};

type RaceControl = {
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driver_number: number | null;
  lap_number: number | null;
  message: string | null;
};

type SessionResult = {
  driver_number: number;
  position: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  number_of_laps: number | null;
};

type Driver = {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
};

async function get<T>(path: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = await fetch(`${API}/${path}`, {
      headers: { 'user-agent': 'grandprixpicks-research' },
    });
    if (res.ok) {
      await wait(POLITE_DELAY_MS);
      return res.json() as Promise<T>;
    }
    if (res.status !== 429) {
      throw new Error(`${path} -> HTTP ${res.status}`);
    }
    const backoff = POLITE_DELAY_MS * 2 ** attempt;
    console.log(`  429 on ${path}, waiting ${backoff}ms (attempt ${attempt})`);
    await wait(backoff);
  }
  throw new Error(`${path} -> still rate limited after ${MAX_ATTEMPTS} tries`);
}

/**
 * Reads a payload from disk if a previous run already wrote it.
 *
 * The fetch is fifteen sessions against a rate-limited API, so a failure
 * two-thirds of the way through should not start again from zero.
 */
async function cached<T>(file: string, fetcher: () => Promise<T>): Promise<T> {
  const path = join(OUT, 'raw', file);
  if (existsSync(path)) {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  }
  const data = await fetcher();
  await writeFile(path, JSON.stringify(data, null, 2));
  return data;
}

/**
 * Messages that name a turn but describe paperwork rather than contact.
 *
 * Track limits is the big one: Baku's turns 15 and 16 generate dozens of lap
 * deletions a weekend and not one of them is a crash. Including them would
 * make the two fastest corners on the map look like the most dangerous.
 */
const PAPERWORK =
  /TRACK LIMITS|UNSAFE RELEASE|PIT LANE|PIT ENTRY|FALSE START|PARC FERME|IMPEDING|TRACK LIMIT|LAP DELETED|TIME DELETED|VIRTUAL SAFETY CAR INFRINGEMENT|YELLOW FLAG INFRINGEMENT|FAILING TO FOLLOW|BLUE FLAG|DRIVING/;

/** Wording that indicates contact or a stopped car. */
const CONTACT =
  /COLLISION|CONTACT|CAR STOPPED|STOPPED ON TRACK|SPUN|CRASH|ACCIDENT|DAMAGE|RECOVERY VEHICLE|CRANE|MARSHALS/;

function isCandidate(m: RaceControl): boolean {
  const text = (m.message ?? '').toUpperCase();
  if (m.flag === 'RED') {
    return true;
  }
  if (PAPERWORK.test(text)) {
    return false;
  }
  if (/TURN \d+ INCIDENT/.test(text)) {
    return true;
  }
  return CONTACT.test(text);
}

async function main() {
  await mkdir(join(OUT, 'raw'), { recursive: true });

  const sessions = await get<Session[]>(
    `sessions?circuit_short_name=${CIRCUIT}`,
  );
  const past = sessions.filter((s) => new Date(s.date_start) < new Date());
  console.log(`${sessions.length} Baku sessions, ${past.length} already run`);

  await writeFile(
    join(OUT, 'raw', 'sessions.json'),
    JSON.stringify(sessions, null, 2),
  );

  const meetingKeys = [...new Set(past.map((s) => s.meeting_key))];
  const drivers: Record<number, Driver> = {};
  for (const mk of meetingKeys) {
    const list = await cached<Driver[]>(`drivers_${mk}.json`, () =>
      get<Driver[]>(`drivers?meeting_key=${mk}`),
    );
    for (const d of list) {
      drivers[d.driver_number] = d;
    }
  }

  const candidates: unknown[] = [];
  const summary: unknown[] = [];

  for (const s of past) {
    const rc = await cached<RaceControl[]>(
      `race_control_${s.session_key}.json`,
      () => get<RaceControl[]>(`race_control?session_key=${s.session_key}`),
    );
    const results = await cached<SessionResult[]>(
      `session_result_${s.session_key}.json`,
      () => get<SessionResult[]>(`session_result?session_key=${s.session_key}`),
    );

    const hits = rc.filter(isCandidate);
    const dnfs = results.filter((r) => r.dnf);

    summary.push({
      year: s.year,
      session: s.session_name,
      session_key: s.session_key,
      messages: rc.length,
      candidates: hits.length,
      red_flags: rc.filter((m) => m.flag === 'RED').length,
      dnfs: dnfs.map((r) => ({
        driver: drivers[r.driver_number]?.name_acronym ?? r.driver_number,
        team: drivers[r.driver_number]?.team_name ?? null,
        laps: r.number_of_laps,
      })),
    });

    for (const m of hits) {
      const turn = /TURN (\d+)/.exec((m.message ?? '').toUpperCase());
      const cars = [...(m.message ?? '').matchAll(/CAR[S]? (\d+)/g)].map((x) =>
        Number(x[1]),
      );
      candidates.push({
        year: s.year,
        session: s.session_name,
        session_key: s.session_key,
        date: m.date,
        lap: m.lap_number,
        flag: m.flag,
        marshal_sector: m.sector,
        turn: turn ? Number(turn[1]) : null,
        drivers: cars.map((n) => drivers[n]?.name_acronym ?? String(n)),
        driver_numbers: cars,
        message: m.message,
      });
    }

    console.log(
      `${s.year} ${s.session_name.padEnd(18)} msgs=${String(rc.length).padStart(3)}  candidates=${String(hits.length).padStart(2)}  dnf=${dnfs.length}`,
    );
  }

  await writeFile(
    join(OUT, 'candidates.json'),
    JSON.stringify(candidates, null, 2),
  );
  await writeFile(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

  const geometry = await (
    await fetch('https://api.multiviewer.app/api/v1/circuits/144/2025', {
      headers: { 'user-agent': 'grandprixpicks-research' },
    })
  ).json();
  await writeFile(
    join(OUT, 'raw', 'circuit_geometry.json'),
    JSON.stringify(geometry, null, 2),
  );

  console.log(`\n${candidates.length} candidate incidents -> ${OUT}`);
}

await main();
