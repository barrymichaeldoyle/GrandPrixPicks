# React 19.3 web upgrade

Implemented 2026-09-22. React, React DOM, and their TypeScript declarations are
pinned to 19.3.0 in the web app. A pnpm package extension gives TanStack Router
an optional React types peer so its declarations resolve against the consuming
app's version, rather than hoisted 19.2 types from another workspace.

## Features adopted

- **Activity:** `StandingsChartsSection` retains visited chart panels, preserving
  legend selections and cursor state across tab changes. Hidden panels pause
  effects, including resize observers. The viewport gate and first-visit gate
  prevent eager loading of unused charts. Headings and fallback tables remain in
  server HTML outside Activity.
- **Effect Events:** modal Escape handling, Top 5 and H2H parent notifications,
  and auth-curtain timeout diagnostics read current callbacks and state without
  restarting effects. Dropdowns keep `useCallbackRef` because they also invoke
  callbacks from direct event handlers. Top 5 notifications retain layout-effect
  timing so restored drafts reach parents before paint.
- **View Transitions:** the leaderboard standing card and board use scoped,
  180ms transitions on router-driven filter updates. Initial entry and removal
  are not animated. Reduced-motion CSS disables these snapshot animations.
  The displayed router search state uses `useDeferredValue` so external-store
  updates activate React transitions without delaying URL navigation.
- **Browser rendering:** session-clock date text uses `use(browser())` inside a
  small Suspense boundary. Server HTML keeps the circuit-local date; hydration
  renders the viewer's timezone. The countdown and the rest of the clock still
  render on the server. Unknown viewer timezones fall back to the circuit date.

Activity and Effect Events were available in 19.2; this work adopts them alongside
19.3's new View Transitions and browser API.

## Deliberately retained

- The live feed's FLIP animation handles frequent updates arriving mid-slide;
  replacing it needs a separate measured prototype.
- Modal and chart wrappers provide semantics and layout, so Fragment refs do not
  justify removing them.
- React Compiler already runs in production. Actions and optimistic state would
  duplicate existing pick submission mechanisms without a demonstrated benefit.
- Trusted Types enforcement remains a separate app-wide integration project.

## Validation

The full suite passed after implementation (1,636 tests), followed by 60 focused
regression tests including a new chart lifecycle/state test and changed modal
callback coverage. Typechecking, lint, and production build passed. Existing
session-clock server-rendering tests verify the circuit-local fallback.

Chrome checks at 1280px and 390px confirmed retained chart selections, real
View Transition calls during leaderboard filter changes, keyboard activation,
reduced-motion rendering, and home-page hydration without page errors. Desktop
and mobile screenshots were inspected. The existing development server needed
dependency re-optimization after the React upgrade.

## References

- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [Activity](https://react.dev/reference/react/Activity)
- [ViewTransition](https://react.dev/reference/react/ViewTransition)
- [browser](https://react.dev/reference/react-dom/browser)
