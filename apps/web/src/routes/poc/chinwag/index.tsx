import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

import { useQuery } from '@/integrations/convex/query';
import { isCreatorPollPreviewAllowed } from '@/lib/creatorPollGate';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { NotFoundPage } from '@/routes/__root';

import type { ChinwagBannerId } from './-components/ChinwagBanner';
import { ChinwagBanner } from './-components/ChinwagBanner';
import { ChinwagCombobox } from './-components/ChinwagCombobox';
import { chinwagHead } from './-components/chinwagHead';
import { ChinwagShell } from './-components/ChinwagShell';
import { PollFooter } from './-components/PollFooter';
import { PollTally } from './-components/PollTally';
import { TommoLinks } from './-components/TommoLinks';

const POLL_SLUG = 'chinwag';
const VOTER_KEY_STORAGE = 'gpp-poll-voter:chinwag';

/** Alt text for his header artwork, which reads "YOUR 2026 RACE PREDICTIONS". */
const HEADER_ALT = 'Your 2026 race predictions';

type Answers = Record<string, string>;

export const Route = createFileRoute('/poc/chinwag/')({
  component: ChinwagPollPage,
  validateSearch: (search: Record<string, unknown>): { k?: string } => ({
    k: typeof search.k === 'string' ? search.k : undefined,
  }),
  loaderDeps: ({ search }) => ({ k: search.k }),
  loader: async ({ deps }) => ({
    allowed: await isCreatorPollPreviewAllowed(deps.k),
  }),
  head: () => {
    // Phase-neutral: `head` runs before the poll is loaded, and a title that
    // says "pre race" on the Race Report vote is worse than a general one.
    const base = chinwagHead('Your 2026 race predictions');
    return {
      ...base,
      meta: [
        ...base.meta,
        // His card, not ours. See `lib/og/chinwagCard.ts`.
        { property: 'og:title', content: 'Your 2026 race predictions' },
        {
          property: 'og:description',
          content:
            'Pole, winner, bangers and clangers. Read out on the Chinwag. No sign-in.',
        },
        { property: 'og:image', content: '/og/chinwag' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/og/chinwag' },
      ],
    };
  },
});

const CARD =
  'rounded-lg border border-[var(--chinwag-border)] bg-[var(--chinwag-card)]';

/**
 * The title card only. It opens with a full-bleed coral rule that has to be
 * clipped to the card's top corners.
 *
 * The question cards deliberately do NOT clip: the picker's listbox is
 * absolutely positioned and a clipping ancestor cuts it off at the card edge,
 * which is exactly what happened the first time. The banner inside them is
 * full-width but touches no corner, so it needs no clipping of its own.
 */
const CARD_CLIPPED = `overflow-hidden ${CARD}`;

/**
 * A random id per browser, held in `localStorage`.
 *
 * It is read in an effect rather than during render because there is no
 * `localStorage` on the server, and generated on first visit so a voter can
 * change their answer later. It identifies a browser, never a person: nothing
 * else about the visitor is stored alongside it.
 */
function useVoterKey(): string | null {
  const [voterKey, setVoterKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
      if (existing) {
        // There is no localStorage on the server, so the key cannot be an
        // initial state value: reading it in an effect is the whole point
        // of the hook, as its doc comment says.
        // oxlint-disable-next-line react/set-state-in-effect
        setVoterKey(existing);
        return;
      }
      const created = crypto.randomUUID();
      window.localStorage.setItem(VOTER_KEY_STORAGE, created);
      setVoterKey(created);
    } catch {
      // Private browsing with storage blocked: vote once, per page load.
      setVoterKey(crypto.randomUUID());
    }
  }, []);

  return voterKey;
}

function ChinwagPollPage() {
  const { allowed } = Route.useLoaderData();
  const search = Route.useSearch();
  const poll = useQuery(api.creatorPolls.getPoll, { slug: POLL_SLUG });
  const results = useQuery(api.creatorPolls.getResults, { slug: POLL_SLUG });
  const voterKey = useVoterKey();
  const myVote = useQuery(
    api.creatorPolls.getMyVote,
    voterKey ? { slug: POLL_SLUG, voterKey } : 'skip',
  );
  const submitVote = useMutation(api.creatorPolls.submitVote);

  /**
   * Only the answers this visit has changed. A returning voter's saved answers
   * are the fallback rather than something copied into state, so the form seeds
   * itself from the query the moment it lands, and a vote arriving from another
   * tab cannot overwrite a selection being made right now.
   */
  const [draft, setDraft] = useState<Answers | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answers: Answers = draft ?? (myVote as Answers | null) ?? {};

  if (!allowed || poll === null) {
    return <NotFoundPage />;
  }

  const phase = poll?.phase ?? 'pre';
  const voted = myVote != null;
  const showForm = poll?.status === 'open' && (!voted || editing);
  const picked =
    poll?.questions.filter((question) => Boolean(answers[question.id]))
      .length ?? 0;
  const complete = poll != null && picked === poll.questions.length;

  async function send() {
    if (!voterKey || !poll) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await submitVote({
        slug: POLL_SLUG,
        voterKey,
        answers: {
          pole: answers.pole!,
          winner: answers.winner!,
          bangerDriver: answers.bangerDriver!,
          clangerDriver: answers.clangerDriver!,
          bangerTeam: answers.bangerTeam!,
          clangerTeam: answers.clangerTeam!,
        },
      });
      setDraft(null);
      setEditing(false);
    } catch (err) {
      setError(
        toUserFacingMessage(err, 'Your predictions weren’t saved. Try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ChinwagShell>
      {/*
        672px, against the 640px Google Forms gives him and the 576px this
        started at. Wider than his rather than narrower: his artwork is the main
        event and it renders bigger here, and the picker rows carry a code, a
        flag, a name and a team, which were tight at the old width.

        Not wider still — past about 700px a column of single-select rows stops
        reading as a form and starts leaving dead space in the middle of every
        row. The source images are 1200px, so there is DPR headroom either way.
      */}
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <ChinwagBanner className="rounded-lg" id="header" title={HEADER_ALT} />

        <div className={CARD_CLIPPED}>
          {/* The 6px coral rule under the title card is his, and it is the one
              thing carrying the brand when the banner is above the fold and
              this is not. */}
          <div className="h-1.5 bg-[var(--chinwag-rule)]" />
          <div className="px-6 py-5">
            <h1 className="text-xl leading-tight tracking-[0.02em] text-[var(--chinwag-ink)] sm:text-2xl">
              {phase === 'post'
                ? 'YOUR 2026 POST RACE BANGERS & CLANGERS'
                : 'YOUR 2026 PRE RACE PREDICTIONS'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--chinwag-ink-muted)]">
              {poll
                ? phase === 'post'
                  ? `${poll.race.name} is done. Four categories, tallied and read out on the Race Report. No sign-in needed. Cheers!`
                  : `${poll.race.name}, round ${poll.race.round}. Six categories, tallied and read out on the ${poll.showName} LIVE podcast. No sign-in needed. Cheers!`
                : 'Loading the weekend.'}
            </p>
          </div>
        </div>

        {poll?.status === 'closed' ? (
          <div className={CARD}>
            <div className="px-6 py-4 text-sm text-[var(--chinwag-ink)]">
              {phase === 'pre'
                ? 'Predictions are closed. Qualifying has started.'
                : 'Voting has closed for this race.'}
            </div>
          </div>
        ) : null}

        {showForm && poll ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {poll.questions.map((question) => (
              <div className={CARD} key={question.id}>
                {/* The artwork IS the label, so it is wrapped in one rather
                    than captioned by a line of text repeating it. His form set
                    the category above the image and again inside it; a screen
                    reader was getting it a third time from the input's own
                    `aria-label`. Now the image's alt is the label's text, the
                    input takes its accessible name from that, and it is
                    announced once.

                    That also lets the image sit flush at the top of the card,
                    which is the tidier thing anyway. */}
                <label className="block" htmlFor={`poll-${question.id}`}>
                  <ChinwagBanner
                    className="rounded-t-lg"
                    id={question.id as ChinwagBannerId}
                    title={question.label}
                  />
                </label>
                <div className="px-5 py-5">
                  <ChinwagCombobox
                    id={`poll-${question.id}`}
                    onChange={(next) =>
                      setDraft({ ...answers, [question.id]: next })
                    }
                    options={
                      question.kind === 'driver'
                        ? poll.drivers.map((driver) => ({
                            code: driver.code,
                            label: driver.displayName,
                            nationality: driver.nationality,
                            number: driver.number,
                            team: driver.team,
                            value: driver.code,
                          }))
                        : poll.teams.map((team) => ({
                            label: team,
                            team,
                            value: team,
                          }))
                    }
                    value={answers[question.id]}
                  />
                </div>
              </div>
            ))}

            {error ? (
              <p className="text-sm text-[var(--chinwag-cta)]">{error}</p>
            ) : null}

            {/* Submit sits at the right, under the end of the cards, where the
                eye finishes each row rather than back at the margin. The count
                stays on the left of it so the reason a disabled button is
                disabled is read before the button, not after. */}
            <div className="flex flex-wrap items-center justify-end gap-4 py-1">
              {/* A disabled button with no reason beside it is a dead end. This
                  says exactly how far off finishing you are. */}
              {complete ? null : (
                <span className="text-sm text-[var(--chinwag-ink-muted)]">
                  {picked} of {poll.questions.length} picked
                </span>
              )}
              {/* Before the primary, not after it: the way out sits inboard of
                  the way on. */}
              {voted ? (
                <button
                  className="text-sm text-[var(--chinwag-cta)] underline underline-offset-2"
                  onClick={() => {
                    setDraft(null);
                    setEditing(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
              <button
                className="h-11 rounded bg-[var(--chinwag-cta)] px-7 font-semibold text-[var(--chinwag-card)] active:bg-[var(--chinwag-cta-press)] disabled:opacity-40"
                disabled={!complete || !voterKey || submitting}
                type="submit"
              >
                {voted ? 'Update' : 'Submit'}
              </button>
            </div>
          </form>
        ) : null}

        {voted && !editing ? (
          <div className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <p className="text-sm text-[var(--chinwag-ink)]">
                Your predictions are in.
              </p>
              {poll?.status === 'open' ? (
                <button
                  className="text-sm text-[var(--chinwag-cta)] underline underline-offset-2"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  Change them
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Results after voting, never before it: a running tally on the form
            is a nudge, and the whole point of the numbers is that they are what
            his audience thinks rather than what the first voters thought. */}
        {voted && results && results.totalVotes > 0 ? (
          <div className={CARD}>
            <div className="px-6 py-5">
              <p className="mb-5 text-sm text-[var(--chinwag-ink-muted)]">
                {results.totalVotes === 1
                  ? '1 vote so far'
                  : `${results.totalVotes} votes so far`}
              </p>
              <div className="flex flex-col gap-5">
                {results.questions.map((question) => (
                  <PollTally
                    key={question.id}
                    label={question.label}
                    options={question.options}
                    selected={answers[question.id]}
                  />
                ))}
              </div>
              <p className="mt-6 text-sm">
                <Link
                  className="text-[var(--chinwag-cta)] underline underline-offset-2"
                  search={{ k: search.k }}
                  to="/poc/chinwag/results"
                >
                  Open the results board
                </Link>
              </p>
            </div>
          </div>
        ) : null}

        {/* After the vote and the numbers, not before them: this is the page's
            last screen, which is where a link tree belongs. A voter who never
            scrolls past the form was never going to follow anyway. No card
            around it — it belongs to the page's footer, not to the form. */}
        <TommoLinks />

        <PollFooter />
      </div>
    </ChinwagShell>
  );
}
