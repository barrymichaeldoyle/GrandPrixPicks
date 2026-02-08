import { createFileRoute, Link } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import {
  ChevronRight,
  Clock,
  Flag,
  Info,
  Lock,
  Swords,
  Target,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';

import { api } from '../../convex/_generated/api';
import { primaryButtonStyles } from '../components/Button';
import { FaqItem, FaqSection } from '../components/Faq';
import { RaceCard } from '../components/RaceCard';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    const nextRace = await convex.query(api.races.getNextRace);
    return { nextRace };
  },
  head: () => ({
    meta: [
      { title: 'Grand Prix Picks - F1 Prediction Game' },
      {
        name: 'description',
        content:
          'Predict the top 5 for every F1 session, call teammate head-to-heads, and compete with friends throughout the 2026 season.',
      },
    ],
  }),
});

function HomePage() {
  const { nextRace } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-16 text-center">
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-center gap-3">
            <Flag className="h-12 w-12 text-accent" />
            <h1 className="text-4xl font-black tracking-tight text-text md:text-5xl">
              Grand Prix Picks
            </h1>
          </div>
          <p className="mb-8 text-xl text-text-muted">
            Predict the top 5 for every qualifying, sprint, and race session.
            Call teammate head-to-heads. Compete with friends all season long.
          </p>
          <Link
            to="/races"
            className={`${primaryButtonStyles('md')} shadow-md`}
          >
            View Races
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Next Race Section */}
      <section className="mx-auto max-w-4xl px-6 pb-12">
        <h2 className="mb-4 text-lg font-semibold text-text-muted">
          Next Race
        </h2>
        {/* Loader type omits null but getNextRace can return null at runtime */}
        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
        {nextRace != null ? (
          <RaceCard race={nextRace} isNext />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-text-muted">No upcoming races scheduled</p>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-text">
          How It Works
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted">
              <Flag className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text">
              Pick Your Top 5
            </h3>
            <p className="text-sm text-text-muted">
              Before each session — qualifying, sprint, and race — drag and drop
              to rank the 5 drivers you think will finish on top.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted">
              <Swords className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text">
              Call the Head-to-Heads
            </h3>
            <p className="text-sm text-text-muted">
              For every teammate pairing on the grid, predict which driver will
              finish ahead. Earn bonus points for each correct call.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted">
              <Trophy className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text">
              Earn Points Every Session
            </h3>
            <p className="text-sm text-text-muted">
              Score up to 25 points per session. Exact picks earn 5 points,
              off-by-one earns 3, and any top-5 hit earns 1. Sprint weekends
              mean even more points up for grabs.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text">
              Compete and Follow Friends
            </h3>
            <p className="text-sm text-text-muted">
              Climb the season leaderboard, follow other players, and compare
              prediction histories on public profile pages.
            </p>
          </div>
        </div>
      </section>

      <FaqSection title="Frequently Asked Questions">
        <FaqItem icon={Target} question="How does scoring work?">
          <p className="mb-3 text-text-muted">
            The same points system applies to qualifying, sprint qualifying (on
            sprint weekends), the sprint, and the race. You pick the top 5 for
            each session; points are awarded by how close your picks are to the
            actual result:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-16 font-bold text-accent">5 points</span>
              <span className="text-text-muted">Exact position match</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-16 font-bold text-accent">3 points</span>
              <span className="text-text-muted">Off by one position</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-16 font-bold text-accent">1 point</span>
              <span className="text-text-muted">
                Driver in top 5, but off by 2+ positions
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-16 font-bold text-text-muted">0 points</span>
              <span className="text-text-muted">
                Driver finishes outside the top 5
              </span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-text-muted">
            Each session scores up to 25 points (all 5 correct). Your weekend
            total is the sum of quali, sprint (if applicable), and race
            scores—so sprint weekends can earn you more points.
          </p>
        </FaqItem>

        <FaqItem icon={Lock} question="When do predictions lock?">
          <p className="text-text-muted">
            Each session locks at its scheduled start time. Qualifying, sprint
            qualifying (on sprint weekends), the sprint, and the race each have
            their own deadline. Once a session is locked, you can't change those
            picks, so get them in before the cutoff.
          </p>
        </FaqItem>

        <FaqItem icon={Clock} question="When can I make predictions?">
          <p className="text-text-muted">
            You predict for the current weekend only. For each session (quali,
            sprint quali, sprint, race), you can submit or edit picks until that
            session's scheduled start time. Future weekends open once the
            current one is done.
          </p>
        </FaqItem>

        <FaqItem icon={Trophy} question="How is the leaderboard calculated?">
          <p className="text-text-muted">
            Your total season score is the sum of all your session scores:
            qualifying, sprint events (when applicable), and the race for every
            weekend. The leaderboard ranks players by that total. Compete
            throughout the 2026 season to claim the top spot!
          </p>
        </FaqItem>
        <FaqItem icon={Swords} question="What are Head-to-Head predictions?">
          <p className="text-text-muted">
            For each race weekend, you can also predict which driver will beat
            their teammate in every pairing on the grid. Each correct call earns
            you a point on the separate H2H leaderboard. H2H predictions lock at
            the same time as your top-5 picks for each session.
          </p>
        </FaqItem>

        <FaqItem icon={UserPlus} question="Can I see other players' picks?">
          <p className="text-text-muted">
            Every player has a public profile page showing their prediction
            history, scores, and stats. Picks are hidden until the relevant
            session locks, so there is no peeking beforehand. You can follow
            other players to keep track of how they are doing throughout the
            season.
          </p>
        </FaqItem>

        <FaqItem icon={Info} question="Is this an official F1 app?">
          <p className="text-text-muted">
            No. Grand Prix Picks isn't affiliated with, endorsed by, or
            connected to Formula 1 or any official F1 entities. We don't use any
            copyright materials or F1 trademarks. It's just an independent
            fan-made prediction game.
          </p>
        </FaqItem>
      </FaqSection>
    </div>
  );
}
