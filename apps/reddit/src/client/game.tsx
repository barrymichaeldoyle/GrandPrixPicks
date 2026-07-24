import './index.css';

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ApiError, InitResponse, SavePicksResponse } from '../shared/api';
import type { Driver } from '../shared/race';

type SessionId = 'quali' | 'race';

function formatDeadline(lockAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(lockAt));
}

export function DriverRow({
  driver,
  position,
  onMove,
  onRemove,
}: {
  driver: Driver;
  position: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <li className="grid grid-cols-[2.25rem_0.3rem_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-2.5">
      <span className="text-center text-lg font-black text-teal-200">
        P{position}
      </span>
      <span
        className="h-10 rounded-full"
        style={{ backgroundColor: driver.color }}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <strong className="block text-sm text-white">
          {driver.code}{' '}
          <span className="font-medium text-slate-200">{driver.name}</span>
        </strong>
        <span className="block truncate text-xs text-slate-400">
          {driver.team}
        </span>
      </span>
      <span className="flex gap-1">
        <button
          className="h-9 w-9 cursor-pointer rounded-lg border border-white/10 text-slate-200 disabled:cursor-default disabled:opacity-25"
          disabled={position === 1}
          aria-label={`Move ${driver.name} up`}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          className="h-9 w-9 cursor-pointer rounded-lg border border-white/10 text-slate-200 disabled:cursor-default disabled:opacity-25"
          disabled={position === 5}
          aria-label={`Move ${driver.name} down`}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button
          className="h-9 w-9 cursor-pointer rounded-lg border border-red-300/15 text-red-200"
          aria-label={`Remove ${driver.name}`}
          onClick={onRemove}
        >
          ×
        </button>
      </span>
    </li>
  );
}

export function App() {
  const [data, setData] = useState<InitResponse | null>(null);
  const [sessionId, setSessionId] = useState<SessionId>('quali');
  const [drafts, setDrafts] = useState<Partial<Record<SessionId, string[]>>>(
    {},
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch('/api/init')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load this race.');
        return (await response.json()) as InitResponse;
      })
      .then((response) => {
        setData(response);
        setCurrentTime(Date.parse(response.serverNow));
        setDrafts({
          ...(response.entries.quali
            ? { quali: response.entries.quali.picks }
            : {}),
          ...(response.entries.race
            ? { race: response.entries.race.picks }
            : {}),
        });
      })
      .catch((error: unknown) => {
        setStatus(
          error instanceof Error ? error.message : 'Could not load this race.',
        );
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime((value) => value + 1_000);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const driverById = useMemo(
    () =>
      new Map(data?.race.drivers.map((driver) => [driver.id, driver]) ?? []),
    [data],
  );

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center text-slate-200">
        <div>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" />
          <p>{status || 'Loading the race weekend…'}</p>
        </div>
      </main>
    );
  }

  const session = data.race.sessions.find((item) => item.id === sessionId)!;
  const picks = drafts[sessionId] ?? [];
  const locked = currentTime >= Date.parse(session.lockAt);
  const selectedDrivers = picks
    .map((driverId) => driverById.get(driverId))
    .filter((driver): driver is Driver => Boolean(driver));
  const availableDrivers = data.race.drivers.filter(
    (driver) => !picks.includes(driver.id),
  );

  function addDriver(driverId: string) {
    if (picks.length < 5 && !locked) {
      setDrafts((current) => ({
        ...current,
        [sessionId]: [...(current[sessionId] ?? []), driverId],
      }));
    }
  }

  function moveDriver(index: number, direction: -1 | 1) {
    setDrafts((current) => {
      const next = [...(current[sessionId] ?? [])];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return { ...current, [sessionId]: next };
    });
  }

  async function save() {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, picks }),
      });
      const body = (await response.json()) as SavePicksResponse | ApiError;
      if (!response.ok || body.type === 'error') {
        throw new Error(
          body.type === 'error' ? body.message : 'Could not save your picks.',
        );
      }
      setData((current) =>
        current
          ? {
              ...current,
              playerCount: body.playerCount,
              entries: { ...current.entries, [sessionId]: body.entry },
            }
          : current,
      );
      setStatus(
        `Saved at ${new Date(body.entry.savedAt).toLocaleTimeString()}`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not save your picks.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 rounded-2xl border border-teal-300/15 bg-slate-950/55 p-4 sm:p-6">
          <p className="text-xs font-bold tracking-[0.18em] text-teal-300 uppercase">
            Round {data.race.round} · Hungary 🇭🇺
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
                {data.race.name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {data.playerCount} community{' '}
                {data.playerCount === 1 ? 'player' : 'players'}
                {data.username ? ` · Playing as u/${data.username}` : ''}
              </p>
            </div>
            <p className="rounded-full bg-teal-300/10 px-3 py-1.5 text-xs font-bold text-teal-200">
              {locked
                ? 'Picks locked'
                : `Locks ${formatDeadline(session.lockAt)}`}
            </p>
          </div>
        </header>

        <nav className="mb-5 grid grid-cols-2 gap-2" aria-label="Race session">
          {data.race.sessions.map((item) => (
            <button
              key={item.id}
              className={`min-h-12 cursor-pointer rounded-xl border px-4 font-bold transition ${
                item.id === sessionId
                  ? 'border-teal-300/50 bg-teal-300/15 text-teal-100'
                  : 'border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]'
              }`}
              onClick={() => {
                setSessionId(item.id);
                setStatus('');
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.12fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">Your top 5</h2>
              <span className="text-sm font-bold text-teal-200">
                {picks.length}/5
              </span>
            </div>
            {selectedDrivers.length ? (
              <ol className="grid gap-2">
                {selectedDrivers.map((driver, index) => (
                  <DriverRow
                    key={driver.id}
                    driver={driver}
                    position={index + 1}
                    onMove={(direction) => moveDriver(index, direction)}
                    onRemove={() =>
                      !locked &&
                      setDrafts((current) => ({
                        ...current,
                        [sessionId]: (current[sessionId] ?? []).filter(
                          (id) => id !== driver.id,
                        ),
                      }))
                    }
                  />
                ))}
              </ol>
            ) : (
              <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
                Tap drivers to fill positions P1 through P5.
              </div>
            )}

            <button
              className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-teal-400 px-5 font-extrabold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              disabled={
                picks.length !== 5 || locked || saving || !data.loggedIn
              }
              onClick={() => void save()}
            >
              {saving
                ? 'Saving…'
                : !data.loggedIn
                  ? 'Log in to Reddit to save'
                  : locked
                    ? 'Session locked'
                    : data.entries[sessionId]
                      ? 'Update picks'
                      : 'Save picks'}
            </button>
            {status && (
              <p
                className="mt-3 text-center text-sm font-semibold text-teal-100"
                role="status"
              >
                {status}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-3">
              <h2 className="text-lg font-extrabold text-white">
                Choose drivers
              </h2>
              <p className="text-sm text-slate-400">
                Five exact picks can score 25 points.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableDrivers.map((driver) => (
                <button
                  key={driver.id}
                  className="min-h-20 cursor-pointer rounded-xl border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-teal-300/35 hover:bg-teal-300/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={picks.length >= 5 || locked}
                  onClick={() => addDriver(driver.id)}
                >
                  <span
                    className="mb-2 block h-1 w-8 rounded-full"
                    style={{ background: driver.color }}
                  />
                  <strong className="block text-sm text-white">
                    {driver.code}
                  </strong>
                  <span className="block truncate text-xs text-slate-400">
                    {driver.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <footer className="py-5 text-center text-xs text-slate-500">
          Grand Prix Picks for Reddit · Reddit picks and website picks are
          separate.
        </footer>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
