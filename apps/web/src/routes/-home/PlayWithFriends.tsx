import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

import { Button } from '@/components/Button/Button';

import { fadeUp } from './animations';

export function PlayWithFriends({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <motion.div
      {...fadeUp}
      className="relative flex flex-col gap-4 overflow-hidden rounded-md border border-racing-red/35 bg-racing-red-muted/35 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-racing-red/25 bg-racing-red-muted/50 sm:flex">
          <Users className="h-5 w-5 text-racing-red" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text">Play with friends</h2>
          <p className="mt-1 text-sm text-text-muted">
            Create a private league, invite your group, and compete every race
            weekend.
          </p>
        </div>
      </div>
      <div className="shrink-0">
        <Button asChild variant="primary" size="md" leftIcon={Users}>
          {isSignedIn ? (
            <Link to="/leagues/create">Create a League</Link>
          ) : (
            <Link to="/leagues">Explore Leagues</Link>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
