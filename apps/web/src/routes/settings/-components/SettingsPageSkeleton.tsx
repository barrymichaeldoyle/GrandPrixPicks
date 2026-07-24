import { Bell, Globe, User } from 'lucide-react';

import { SettingsSection } from '@/components/SettingsSection';

import { SeasonPassSection } from './SeasonPassSection';

const IN_APP_SKELETON_WIDTHS = ['w-40', 'w-32', 'w-32'];

export function SettingsPageSkeleton() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-2 h-3 w-20 animate-pulse rounded-sm bg-surface-muted" />
        <div className="mb-2 h-10 w-48 animate-pulse rounded-sm bg-surface-muted" />
        <div className="mb-6 h-4 w-96 max-w-full animate-pulse rounded-sm bg-surface-muted" />
        <div className="grid items-start gap-6 md:grid-cols-[10rem_minmax(0,1fr)] lg:gap-10">
          <div className="hidden space-y-2 md:block">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-9 animate-pulse rounded-sm bg-surface-muted"
              />
            ))}
          </div>
          <div className="space-y-4">
            <SettingsSection
              id="profile"
              title="Profile"
              icon={<User className="h-5 w-5 text-accent" />}
            >
              <div className="flex animate-pulse items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-surface-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-surface-muted" />
                  <div className="h-3 w-24 rounded bg-surface-muted" />
                </div>
              </div>
            </SettingsSection>

            <SeasonPassSection season={2026} hasSeasonPass={undefined} />

            <SettingsSection
              title="Regional"
              icon={<Globe className="h-5 w-5 text-accent" />}
            >
              <div className="min-h-[170px] space-y-4">
                <div className="space-y-2">
                  <div className="h-3 w-80 max-w-full animate-pulse rounded bg-surface-muted" />
                  <div className="h-3 w-64 max-w-full animate-pulse rounded bg-surface-muted" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
                    <div className="h-10 animate-pulse rounded-sm border border-border bg-surface-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
                    <div className="h-10 animate-pulse rounded-sm border border-border bg-surface-muted" />
                  </div>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection
              id="notifications"
              title="Notifications"
              icon={<Bell className="h-5 w-5 text-accent" />}
            >
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">
                    In-App
                  </p>
                  <div className="divide-y divide-border bg-page px-3">
                    {IN_APP_SKELETON_WIDTHS.map((width) => (
                      <div key={width} className="flex items-center gap-3 py-3">
                        <div
                          className={`h-3 ${width} animate-pulse rounded bg-surface-muted`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">
                    Email
                  </p>
                  <div className="divide-y divide-border bg-page px-3">
                    {[0, 1].map((index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="h-3 w-40 animate-pulse rounded bg-surface-muted" />
                        <div className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-surface-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
}
