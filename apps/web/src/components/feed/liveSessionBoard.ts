import type { Id } from '@convex-generated/dataModel';
import type {
  LiveBoard as SharedLiveBoard,
  LivePlayer as SharedLivePlayer,
} from '@grandprixpicks/shared/liveSessionBoard';

export {
  liveSessionType,
  rankLiveGroup,
} from '@grandprixpicks/shared/liveSessionBoard';

/** The shared shapes, keyed by this app's user id. */
export type LivePlayer = SharedLivePlayer<Id<'users'>>;
export type LiveBoard = SharedLiveBoard<Id<'users'>>;
