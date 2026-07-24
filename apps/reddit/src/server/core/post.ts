import { context, reddit, redis } from '@devvit/web/server';
import { prototypeRace } from '../../shared/race';
import { canonicalPostKey } from './storage';

export type RacePost = { id: string };

export async function createRacePost(): Promise<RacePost> {
  const existingPostId = await redis.get(canonicalPostKey);
  if (existingPostId) {
    return { id: existingPostId };
  }

  if (!context.subredditName) {
    throw new Error('A subreddit is required to create the race post.');
  }

  const post = await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: `${prototypeRace.season} Hungarian GP Predictions: Pick the Top 5`,
    entry: 'default',
    postData: { raceSlug: prototypeRace.slug },
    textFallback: {
      text: 'Pick your top five for the Hungarian Grand Prix inside this interactive post.',
    },
  });

  await redis.set(canonicalPostKey, post.id);
  return { id: post.id };
}
