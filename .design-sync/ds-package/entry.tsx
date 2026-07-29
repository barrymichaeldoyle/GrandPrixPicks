// Design-system entry for /design-sync.
//
// apps/web is an application, not a published component library, so there is no
// dist/ with an export surface for the converter to bundle. This barrel IS that
// surface: it names the components claude.ai/design should build UIs with, and
// esbuild bundles it straight from source via the tsconfig paths in
// .design-sync/tsconfig.ds.json.
//
// Why it matters which names appear here: the preview compiler redirects any
// story import that resolves to an EXPORTED component's module at
// window.GrandPrixPicks (lib/story-imports.mjs rule 2), so exported names render
// from the shipped bundle. Anything omitted is bundled a second time from
// source, which is why the components stories actually mount belong in this
// list rather than only their parents.

export { Avatar } from '../../apps/web/src/components/Avatar';
export { Badge, StatusBadge } from '../../apps/web/src/components/Badge';
export { Button } from '../../apps/web/src/components/Button/Button';
export { ConfirmDialog } from '../../apps/web/src/components/ConfirmDialog';
export {
  DriverBadge,
  DriverBadgeSkeleton,
  ScoredDriverBadge,
} from '../../apps/web/src/components/DriverBadge';
export { Flag } from '../../apps/web/src/components/Flag';
export { FollowButton } from '../../apps/web/src/components/FollowButton';
export { H2HMatchupGrid } from '../../apps/web/src/components/H2HMatchupGrid';
export {
  LeagueMembersList,
  LeagueMembersListSkeleton,
} from '../../apps/web/src/components/LeagueMembersList';
export { NoticeCard } from '../../apps/web/src/components/NoticeCard';
export { PageHeader } from '../../apps/web/src/components/PageHeader';
export { Pill } from '../../apps/web/src/components/Pill';
export { PredictionCountdownBadge } from '../../apps/web/src/components/PredictionCountdownBadge';
export { ScoreRing } from '../../apps/web/src/components/ScoreRing';
export { SettingsSection } from '../../apps/web/src/components/SettingsSection';
export { StepBadge } from '../../apps/web/src/components/StepBadge';
export { TabSwitch } from '../../apps/web/src/components/TabSwitch';
export { Tooltip } from '../../apps/web/src/components/Tooltip';

// Feed: the stories mount the parts, not just FeedItem.
export { FeedItem } from '../../apps/web/src/components/FeedItem/FeedItem';
export { SessionGroup } from '../../apps/web/src/components/FeedItem/SessionGroup';
export {
  FeedEmptyState,
  FeedItemSkeleton,
} from '../../apps/web/src/components/FeedItem/states';

// Loading affordances — one card ("Loading states") shows all three together.
export { InlineLoader } from '../../apps/web/src/components/InlineLoader';
export { PageLoader } from '../../apps/web/src/components/PageLoader';
export { RaceCardSkeleton } from '../../apps/web/src/components/RaceCardSkeleton';

export { UpcomingPredictionNudge } from '../../apps/web/src/components/UpcomingPredictionBanner/UpcomingPredictionNudge';

// Route-level compositions that carry design decisions worth reusing.
export { LeaderboardTeaser } from '../../apps/web/src/routes/-home/LeaderboardTeaser';
export { RaceEventPage } from '../../apps/web/src/routes/races/$raceSlug/-components/RaceEventPage/RaceEventPage';

// Preview/runtime providers.
//
// Decorator auto-bundling cannot work here: .storybook/preview.tsx imports
// ../src/styles.css, which is Tailwind 4 source, and esbuild fails on
// `@import 'tailwindcss'`. PreviewRoot is the explicit cfg.provider chain that
// replaces it, mirroring that decorator exactly.
//
// The two inner providers stay exported deliberately. Any story importing them
// resolves to the shipped bundle rather than being bundled a second time from
// source, which is what keeps React context identity intact.
export { PreviewRoot } from './PreviewRoot';
export { StorybookRouter } from '../../apps/web/src/stories/router-decorator';

// The WHOLE mockAppRuntime surface, not just the provider component.
// cfg.storyImports.shim forces story imports of this module to the bundle
// global, so anything a story pulls from it must exist there: FollowButton's
// story builds its query mocks with buildStorybookConvexMocks, and a missing
// helper would leave the provider with no mocks at all.
export {
  buildStorybookConvexMocks,
  renderSignedInOnly,
  resolveStorybookQuery,
  StorybookMockProviders,
  useStorybookMockState,
} from '../../apps/web/src/storybook/mockAppRuntime';
