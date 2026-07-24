import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export function Splash() {
  return (
    <main className="flex min-h-screen items-center p-4 sm:p-6">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-teal-300/20 bg-slate-950/65 shadow-2xl shadow-teal-950/40">
        <div className="h-1 bg-gradient-to-r from-teal-300 via-teal-500 to-transparent" />
        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-7">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.2em] text-teal-300 uppercase">
              Round 11 · Hungary 🇭🇺
            </p>
            <h1 className="max-w-xl text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl">
              Pick your top 5
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Rank the drivers for qualifying and the race. Score points and
              climb this community&apos;s leaderboard.
            </p>
            <p className="mt-4 text-sm font-semibold text-teal-200">
              Qualifying locks Saturday at 14:00 UTC
            </p>
          </div>
          <button
            className="min-h-12 cursor-pointer rounded-xl bg-teal-400 px-6 py-3 font-extrabold text-slate-950 transition hover:bg-teal-300 active:scale-[0.98]"
            onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
          >
            Make your picks
          </button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
);
