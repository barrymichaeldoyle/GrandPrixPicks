import { SignInButton } from '@clerk/react';
import { LogIn } from 'lucide-react';

import { Button } from '@/components/Button/Button';

export function SignInRequired() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
          <h1 className="mb-2 text-2xl font-bold text-text">
            Sign In Required
          </h1>
          <p className="mb-4 text-text-muted">
            Sign in to access your settings.
          </p>
          <SignInButton mode="modal">
            <Button size="sm">Sign In</Button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}
