import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { api } from '../../../../convex/_generated/api';
import { NotFoundPage } from '../../__root';

export const Route = createFileRoute('/admin/races/new')({
  component: AdminNewRacePage,
});

function AdminNewRacePage() {
  const navigate = useNavigate();
  const isAdmin = useQuery(api.users.amIAdmin);
  const upsertRace = useMutation(api.races.adminUpsertRace);

  const [formData, setFormData] = useState({
    name: '',
    round: 1,
    season: 2026,
    slug: '',
    raceDate: '',
    raceTime: '14:00',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAdmin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return <NotFoundPage />;
  }

  const generateSlug = (name: string) => {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + `-${formData.season}`
    );
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.raceDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const raceDateTime = new Date(
        `${formData.raceDate}T${formData.raceTime}:00`,
      );
      const raceStartAt = raceDateTime.getTime();
      const predictionLockAt = raceStartAt;

      await upsertRace({
        season: formData.season,
        round: formData.round,
        name: formData.name,
        slug: formData.slug,
        raceStartAt,
        predictionLockAt,
        status: 'upcoming',
      });

      navigate({ to: '/admin' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create race');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/admin"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={20} />
          Back to Admin
        </Link>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h1 className="mb-6 text-2xl font-bold text-white">Add New Race</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Race Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Monaco Grand Prix"
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Round
                </label>
                <input
                  type="number"
                  value={formData.round}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      round: parseInt(e.target.value) || 1,
                    })
                  }
                  min={1}
                  max={30}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Season
                </label>
                <input
                  type="number"
                  value={formData.season}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      season: parseInt(e.target.value) || 2026,
                    })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                URL Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Race Date *
                </label>
                <input
                  type="date"
                  value={formData.raceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, raceDate: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Race Time (local)
                </label>
                <input
                  type="time"
                  value={formData.raceTime}
                  onChange={(e) =>
                    setFormData({ ...formData, raceTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-600 disabled:bg-slate-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Create Race
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
