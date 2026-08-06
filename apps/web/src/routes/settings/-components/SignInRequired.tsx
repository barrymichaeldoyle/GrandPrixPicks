import { SlidersHorizontal } from 'lucide-react';

import { SignInPrompt } from '@/components/SignInPrompt';

export function SignInRequired() {
  return (
    <SignInPrompt
      icon={SlidersHorizontal}
      title="Your account settings"
      description="Your display name and avatar, timezone and locale for session times, notification preferences, and your season pass."
      actionLabel="Sign in to manage your account"
    />
  );
}
