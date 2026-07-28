import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from './Button/Button';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Components/ConfirmDialog',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Opens on demand so the focus trap and Escape handling can be exercised. */
export const Interactive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Leave league</Button>
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          title="Leave this league?"
          description="You will drop off the league leaderboard. You can rejoin later with the invite link."
          confirmLabel="Leave league"
        />
      </>
    );
  },
};

/** Confirm button held in its pending state while the mutation runs. */
export const Loading: Story = {
  render: () => (
    <ConfirmDialog
      open
      onClose={() => {}}
      onConfirm={() => {}}
      title="Delete your account?"
      description="This removes your picks, scores and league memberships. It cannot be undone."
      confirmLabel="Delete account"
      loading
    />
  ),
};

/** A failed mutation keeps the dialog open and surfaces the reason. */
export const WithError: Story = {
  render: () => (
    <ConfirmDialog
      open
      onClose={() => {}}
      onConfirm={() => {}}
      title="Delete your account?"
      description="This removes your picks, scores and league memberships. It cannot be undone."
      confirmLabel="Delete account"
      error="Could not reach the server. Check your connection and try again."
    />
  ),
};
