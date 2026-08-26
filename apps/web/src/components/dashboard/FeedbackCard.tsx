import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';

import { FeedbackModal } from '@/components/FeedbackModal';
import { RailCardAction } from '@/components/dashboard/RailCardAction';
import { captureAnalyticsEvent } from '@/lib/analytics';

/**
 * The ask for feedback, where the player already is.
 *
 * It sits under the latest result on purpose: that is the moment someone has
 * just seen how they did and has an opinion about the game, which is exactly
 * the opinion `/support` never hears because getting there means leaving what
 * you were doing. The card is a prompt, not a form; the writing happens in
 * {@link FeedbackModal}, over the page rather than instead of it.
 */
export function FeedbackCard() {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface"
      aria-labelledby="feedback-card-heading"
    >
      <div className="p-4">
        <p id="feedback-card-heading" className="gpp-label">
          Feedback
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Something broken, missing, or just annoying? Tell us in a line.
        </p>
      </div>
      <RailCardAction
        icon={MessageSquarePlus}
        onClick={() => {
          captureAnalyticsEvent('feedback_widget_opened', {
            source: 'dashboard_rail',
          });
          setOpen(true);
        }}
      >
        Send feedback
      </RailCardAction>

      <FeedbackModal
        open={open}
        onClose={() => setOpen(false)}
        source="dashboard_rail"
      />
    </section>
  );
}
