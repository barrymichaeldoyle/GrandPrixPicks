import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Flag,
  Gauge,
  Lock,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

import { Button } from '../components/Button';
import { DevNowPanel } from '../components/DevNowPanel';
import { FaqItem, FaqSection } from '../components/Faq';
import { getCountryCodeForRace, RaceFlag } from '../components/RaceCard';
import { formatDate, formatTime, useCountdown } from '../lib/date';
import { canonicalMeta, defaultOgImage } from '../lib/site';
import { useNow } from '../lib/testing/now';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    const now = Date.now();
    const nextRace = await convex.query(api.races.getNextRace);
    const races = await convex.query(api.races.listRaces, {});
    const currentOrRecentRace =
      races
        .filter((race) => race.status !== 'upcoming' && race.raceStartAt <= now)
        .sort((a, b) => b.raceStartAt - a.raceStartAt)[0] ?? null;

    return { nextRace, currentOrRecentRace, now };
  },
  head: () => {
    const title =
      'Grand Prix Picks - Free F1 Prediction Game for the 2026 Season';
    const description =
      'Predict the top 5 finishers for every qualifying, sprint, and race session. Call teammate head-to-heads and compete with friends on the season leaderboard.';
    const canonical = canonicalMeta('/');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function HomePage() {
  const {
    nextRace,
    currentOrRecentRace,
  } = Route.useLoaderData();
  const now = useNow();
  const { isSignedIn } = useAuth();

  const cooldownEndsAt = currentOrRecentRace.raceStartAt + 24 * 60 * 60 * 1000;
  const showNextRace = nextRace != null && now >= cooldownEndsAt;
  const featuredRace = showNextRace ? nextRace : currentOrRecentRace;
  const featuredRaceLabel = showNextRace ? 'Next Race' : 'Latest Weekend';
  const cooldownCountdown = useCountdown(cooldownEndsAt);
  const nextEvent = (() => {
    if (!showNextRace) {
      return null;
    }
    const sessions = (
      nextRace.hasSprint
        ? [
            { label: 'Sprint Quali', at: nextRace.sprintQualiStartAt },
            { label: 'Sprint', at: nextRace.sprintStartAt },
            { label: 'Qualifying', at: nextRace.qualiStartAt },
            { label: 'Race', at: nextRace.raceStartAt },
          ]
        : [
            { label: 'Qualifying', at: nextRace.qualiStartAt },
            { label: 'Race', at: nextRace.raceStartAt },
          ]
    ).filter(
      (s): s is { label: string; at: number } => typeof s.at === 'number',
    );

    return sessions.find((s) => s.at > now) ?? null;
  })();
  const nextEventCountdown = useCountdown(nextEvent?.at ?? 0);

  return (
    <>
      <div className="bg-page">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden px-6 py-14 sm:py-18">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
          <motion.div {...fadeUp} className="w-full text-center">
            <motion.p
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted/70 px-3 py-1 text-xs font-semibold text-text-muted"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <CalendarDays
                className="h-3.5 w-3.5 text-accent"
                aria-hidden="true"
              />
              2026 Season • Free to Play
            </motion.p>

            <motion.div
              className="mb-5 flex items-center justify-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Flag
                className="mt-1 h-10 w-10 shrink-0 text-accent"
                aria-hidden="true"
              />
              <h1 className="text-3xl font-bold tracking-tight text-text sm:text-5xl">
                Grand Prix Picks
              </h1>
            </motion.div>

            <motion.p
              className="mx-auto max-w-2xl max-w-[500px] text-lg text-text-muted sm:text-xl"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              Make your call for every session, win teammate battles, and climb
              the season leaderboard with your friends.
            </motion.p>

            <motion.div
              className="mt-7 flex flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {showNextRace ? (
                <Button
                  asChild
                  variant="primary"
                  size="md"
                  rightIcon={ArrowRight}
                >
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: nextRace.slug }}
                  >
                    Make predictions now
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="primary"
                  size="md"
                  rightIcon={ArrowRight}
                >
                  <Link to="/races">View races</Link>
                </Button>
              )}
              <Button asChild variant="secondary" size="md">
                <Link to="/leaderboard">See leaderboard</Link>
              </Button>
            </motion.div>

            <motion.div
              className="mt-6 flex flex-wrap justify-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Session locks prevent peeking
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
                <Swords className="h-3.5 w-3.5 text-accent" />
                Top 5 + Head-to-Head
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
                <Users className="h-3.5 w-3.5 text-accent" />
                Public profiles and follows
              </span>
            </motion.div>
          </motion.div>

          <motion.aside
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.18 }}
            className="w-full max-w-3xl rounded-2xl border border-border bg-surface/85 p-4"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-muted">
                  {featuredRaceLabel}
                </p>
                {showNextRace ? (
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    rightIcon={ArrowRight}
                  >
                    <Link
                      to="/races/$raceSlug"
                      params={{ raceSlug: featuredRace.slug }}
                    >
                      Open race page
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="flex items-start gap-2.5">
                {(() => {
                  const countryCode = getCountryCodeForRace(featuredRace);
                  return countryCode ? (
                    <span className="shrink-0">
                      <RaceFlag countryCode={countryCode} size="lg" />
                    </span>
                  ) : null;
                })()}
                <div className="min-w-0 space-y-1">
                  <h3 className="text-2xl leading-tight font-semibold text-text">
                    {featuredRace.name}
                  </h3>
                  <p
                    className="text-sm text-text-muted"
                    suppressHydrationWarning
                  >
                    {formatDate(featuredRace.raceStartAt)} •{' '}
                    {formatTime(featuredRace.raceStartAt)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {showNextRace && nextEvent ? (
                      <span
                        className="text-xs font-semibold text-accent tabular-nums"
                        suppressHydrationWarning
                      >
                        {nextEventCountdown} to {nextEvent.label}
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold text-text-muted"
                        suppressHydrationWarning
                      >
                        Next race returns {cooldownCountdown}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full border border-border bg-surface-muted/40 px-2 py-0.5 text-xs font-medium text-text-muted">
                      Round {featuredRace.round}
                    </span>
                    {featuredRace.hasSprint ? (
                      <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent-muted px-2 py-0.5 text-xs font-semibold text-accent">
                        Sprint weekend
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* Feed prompt — signed-in users have a dedicated /feed page */}
      {isSignedIn && (
        <section className="mx-auto max-w-3xl px-6 pb-2">
          <Button asChild variant="secondary" size="sm" leftIcon={Gauge}>
            <Link to="/feed">Go to your feed</Link>
          </Button>
        </section>
      )}

      {/* Why play */}
      <section className="mx-auto max-w-6xl px-6 pb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <motion.div
            {...fadeUp}
            className="rounded-xl border border-border/70 bg-surface/50 p-4 text-center"
          >
            <p className="mb-1 text-sm font-semibold text-text">Fast to play</p>
            <p className="text-sm text-text-muted">
              Submit once for the weekend, then fine-tune by session.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.06 }}
            className="rounded-xl border border-border/70 bg-surface/50 p-4 text-center"
          >
            <p className="mb-1 text-sm font-semibold text-text">
              More than race winner
            </p>
            <p className="text-sm text-text-muted">
              Top 5 accuracy plus teammate battles every session.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="rounded-xl border border-border/70 bg-surface/50 p-4 text-center"
          >
            <p className="mb-1 text-sm font-semibold text-text">Social layer</p>
            <p className="text-sm text-text-muted">
              Follow players, compare histories, and chase leaderboard rank.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-text">
          How It Works
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.div
            {...fadeUp}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
              <Flag className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-text">
              Pick Your Top 5
            </h3>
            <p className="text-sm text-text-muted">
              Before each session — qualifying, sprint, and race — drag and drop
              to rank the 5 drivers you think will finish on top.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.06 }}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
              <Swords className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-text">
              Call the Head-to-Heads
            </h3>
            <p className="text-sm text-text-muted">
              For every teammate pairing on the grid, predict which driver will
              finish ahead. Earn bonus points for each correct call.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
              <Trophy className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-text">
              Earn Points Every Session
            </h3>
            <p className="text-sm text-text-muted">
              Top-5 picks score up to 25 points per session: exact position
              earns 5, one place away earns 3, and any other actual top-5 hit
              earns 1. A P5 pick that finishes P6 still counts as one place
              away. Head-to-head points stack on top, and sprint weekends mean
              even more to play for.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.16 }}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
              <Users className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-text">
              Compete and Follow Friends
            </h3>
            <p className="text-sm text-text-muted">
              Climb the season leaderboard, follow other players, and compare
              prediction histories on public profile pages.
            </p>
          </motion.div>
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
              <span className="text-text-muted">
                One place away, including P5 picked and P6 actual
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-16 font-bold text-accent">1 point</span>
              <span className="text-text-muted">
                Driver finishes in the actual top 5, but is off by 2+ positions
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
          <p className="mt-3 text-sm text-text-muted">
            Head-to-Head scoring is separate: each correct teammate matchup
            earns 1 point per session.
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
      </FaqSection>

        <section className="mx-auto max-w-5xl px-6 pb-14">
          <div className="rounded-xl border border-border bg-surface p-4 text-center sm:p-5">
            <p className="text-sm text-text-muted">
              Want more details?
              <Link
                to="/support"
                className="ml-1 font-semibold text-accent hover:text-accent/85"
              >
                Ask a question
              </Link>
              {' or '}
              <Link
                to="/races"
                className="font-semibold text-accent hover:text-accent/85"
              >
                browse all races
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
      {import.meta.env.DEV ? (
        <DevNowPanel race={featuredRace ?? null} now={now} />
      ) : null}
    </>
  );
}
