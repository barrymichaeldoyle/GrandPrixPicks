import { SignInPrompt } from '@/components/SignInPrompt';

export function SignInRequired() {
  return (
    <SignInPrompt
      eyebrow="Settings"
      title="How the game reaches you"
      description="Your name on the leaderboard, the timezone session times are shown in, and which reminders actually reach your phone."
      actionLabel="Sign in to manage your account"
      behind={[
        'Display name and avatar',
        'Timezone and locale for session times',
        'Email and push notification preferences',
        'Season pass and billing',
      ]}
    />
  );
}
