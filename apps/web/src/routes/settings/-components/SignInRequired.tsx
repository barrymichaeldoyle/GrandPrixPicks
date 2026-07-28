import { SignInButton } from '@clerk/react';
import { LogIn } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { NoticeCard } from '@/components/NoticeCard';

export function SignInRequired() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <NoticeCard
          level="page"
          icon={LogIn}
          title="Sign In Required"
          description="Sign in to access your settings."
          action={
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          }
        />
      </div>
    </div>
  );
}
