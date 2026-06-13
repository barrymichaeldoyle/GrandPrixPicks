import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { useMutation, useQuery } from 'convex/react';
import {
  Check,
  Copy,
  Crown,
  Gauge,
  Globe,
  Lock,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { XLogoIcon } from '@/components/ShareOnXButton';
import { TabSwitch } from '@/components/TabSwitch';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { buildXShareIntentUrl } from '@/lib/share';
import { siteConfig } from '@/lib/site';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { LeagueFeed } from './LeagueFeed';
import { LeagueMembers } from './LeagueMembers';
import { leagueRouteApi } from './routeApi';
import type { LeagueView } from './types';

type League = NonNullable<
  ReturnType<typeof useQuery<typeof api.leagues.getLeagueBySlug>>
>;

export function LeagueDetailContent({ league }: { league: League }) {
  const isAdmin = league.viewerRole === 'admin';
  const isMember = league.viewerRole !== null;

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Button asChild size="sm" variant="text">
              <Link to="/leagues">← Back to leagues</Link>
            </Button>
            {isAdmin && (
              <Button asChild size="sm" variant="secondary" leftIcon={Settings}>
                <Link
                  to="/leagues/$slug/settings"
                  params={{ slug: league.slug }}
                >
                  Settings
                </Link>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-text">{league.name}</h1>
            {isAdmin && <Crown className="h-5 w-5 text-warning" />}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                league.visibility === 'public'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {league.visibility === 'public' ? (
                <>
                  <Globe className="h-3 w-3" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Private
                </>
              )}
            </span>
          </div>
          {league.description && (
            <p className="mt-1 text-text-muted">{league.description}</p>
          )}
          <p className="mt-1 text-sm text-text-muted">
            {league.memberCount} member{league.memberCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Join flow for non-members */}
        {!isMember && (
          <JoinSection leagueId={league._id} hasPassword={league.hasPassword} />
        )}

        {/* Share link — visible to all members */}
        {isMember && (
          <ShareLinkSection slug={league.slug} leagueName={league.name} />
        )}

        {isMember && (
          <LeagueTabs leagueId={league._id} leagueName={league.name} />
        )}
      </div>
    </div>
  );
}

function JoinSection({
  leagueId,
  hasPassword,
}: {
  leagueId: Id<'leagues'>;
  hasPassword: boolean;
}) {
  const joinLeague = useMutation(api.leagues.joinLeague);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  async function handleJoin() {
    setError(null);
    setIsJoining(true);
    try {
      await joinLeague({
        leagueId,
        password: password || undefined,
      });
      captureAnalyticsEvent('league_joined', {
        league_id: leagueId,
        had_password: hasPassword,
      });
      await confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      captureAnalyticsEvent('league_join_failed', {
        league_id: leagueId,
        had_password: hasPassword,
      });
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to join league',
      );
      setIsJoining(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-6 text-center">
      <Users className="mx-auto mb-4 h-12 w-12 text-accent" />
      <h2 className="mb-2 text-lg font-semibold text-text">Join this league</h2>
      {hasPassword && (
        <div className="mx-auto mb-3 max-w-xs">
          <div className="flex items-center gap-2">
            <Lock
              className="h-4 w-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              aria-label="League password"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <Button size="sm" loading={isJoining} onClick={() => void handleJoin()}>
        Join League
      </Button>
    </div>
  );
}

function ShareLinkSection({
  slug,
  leagueName,
}: {
  slug: string;
  leagueName: string;
}) {
  const [copied, setCopied] = useState(false);

  const leagueUrl = `${window.location.origin}/leagues/${slug}`;

  const xShareUrl = buildXShareIntentUrl(
    `Join my "${leagueName}" league on ${siteConfig.social.x.handle} 🏎️🏁\n\nPredict the top 5 for every F1 session this season.\n\n#F1`,
    leagueUrl,
  );

  async function copyToClipboard() {
    await navigator.clipboard.writeText(leagueUrl);
    captureAnalyticsEvent('league_invite_copied', {
      league_slug: slug,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-text-muted">
        Share League
      </h3>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-surface-muted px-3 py-2 text-sm text-text">
          {leagueUrl}
        </code>
        <button
          type="button"
          onClick={() => void copyToClipboard()}
          aria-label={copied ? 'Copied!' : 'Copy league link'}
          className="shrink-0 rounded-lg border border-border p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <a
          href={xShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            captureAnalyticsEvent('league_invite_shared_x', {
              league_slug: slug,
            })
          }
          aria-label="Share league on X"
          className="shrink-0 rounded-lg border border-border p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          <XLogoIcon className="h-4 w-4" />
        </a>
        <span aria-live="polite" className="sr-only">
          {copied ? 'Link copied!' : ''}
        </span>
      </div>
    </div>
  );
}

const VIEW_OPTIONS = [
  { value: 'standings' as const, label: 'Standings', leftIcon: Trophy },
  { value: 'feed' as const, label: 'Feed', leftIcon: Gauge },
];

function LeagueTabs({
  leagueId,
  leagueName,
}: {
  leagueId: Id<'leagues'>;
  leagueName: string;
}) {
  const search = leagueRouteApi.useSearch();
  const navigate = leagueRouteApi.useNavigate();
  const view: LeagueView = search.view ?? 'standings';

  return (
    <div>
      <div className="mb-4">
        <TabSwitch
          value={view}
          onChange={(v) =>
            navigate({
              search: (prev) => ({ ...prev, view: v }),
              replace: true,
            })
          }
          options={VIEW_OPTIONS}
          className="flex gap-1"
          buttonClassName="flex-1"
          ariaLabel="League view"
        />
      </div>
      {view === 'standings' ? (
        <LeagueMembers leagueId={leagueId} leagueName={leagueName} />
      ) : (
        <LeagueFeed leagueId={leagueId} />
      )}
    </div>
  );
}
