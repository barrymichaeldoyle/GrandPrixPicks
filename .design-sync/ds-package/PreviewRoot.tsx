import { type PropsWithChildren, useEffect } from 'react';

import { StorybookMockProviders } from '../../apps/web/src/storybook/mockAppRuntime';
import { StorybookRouter } from '../../apps/web/src/stories/router-decorator';

/**
 * The provider chain every Grand Prix Picks component needs in order to render
 * outside the app. It mirrors the decorator in apps/web/.storybook/preview.tsx,
 * which is the render the design-sync previews are graded against.
 *
 * Three things it supplies, all of them load-bearing:
 *
 * 1. `.dark` / `data-theme="dark"` on <html>. Every design token in
 *    tokens.generated.css is declared under `.dark, [data-theme='dark']`, so
 *    without this the custom properties never resolve and every colour falls
 *    back to a browser default. It goes on documentElement rather than only on
 *    the wrapper because Tooltip and ConfirmDialog render through a portal onto
 *    document.body, outside any wrapper div.
 * 2. StorybookMockProviders — the repo's stand-in for the Clerk + Convex
 *    runtime, so components that read auth or query data render a signed-in
 *    demo state instead of crashing.
 * 3. StorybookRouter — anything rendering a <Link> needs router context, or it
 *    throws "Cannot read properties of null (reading 'stores')".
 */
export function PreviewRoot({ children }: PropsWithChildren) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.dataset.theme = 'dark';
  }, []);

  return (
    <StorybookMockProviders>
      <div
        className="dark"
        data-theme="dark"
        style={{
          boxSizing: 'border-box',
          padding: '1rem',
          backgroundColor: 'var(--page)',
        }}
      >
        <StorybookRouter>{children}</StorybookRouter>
      </div>
    </StorybookMockProviders>
  );
}
