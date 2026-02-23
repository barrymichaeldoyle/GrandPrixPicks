Welcome to your new TanStack app!

# Getting Started

To run this application:

```bash
pnpm install
pnpm dev
```

# Building For Production

To build this application for production:

```bash
pnpm build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
pnpm lint
pnpm format
pnpm check
```

## Setting up Clerk

- Set the `VITE_CLERK_PUBLISHABLE_KEY` in your `.env.local`.

### Deploying to Cloudflare Pages

To avoid 500 errors (`HTTPError`) from Clerk’s middleware on Cloudflare Pages:

1. **`wrangler.toml`** already includes `compatibility_flags = ["nodejs_compat", "nodejs_compat_populate_process_env"]`. That makes dashboard env vars available as `process.env` in the Worker so Clerk can read `CLERK_JWT_KEY` and `CLERK_SECRET_KEY`. Don't remove these flags.

2. In the [Cloudflare Dashboard](https://dash.cloudflare.com) → your Pages project → **Settings** → **Environment variables**, add:
   - **CLERK_SECRET_KEY** (required for server-side auth)
   - **VITE_CLERK_PUBLISHABLE_KEY** (so the client can talk to Clerk; set for Production and/or Preview as needed)
   - **CLERK_JWT_KEY** (recommended) – enables networkless JWT verification so the edge worker doesn’t call Clerk’s API on every request. Get this from [Clerk Dashboard](https://dashboard.clerk.com) → **API Keys** → JWT public key (JWKS).

3. If you don’t set `CLERK_JWT_KEY`, the worker will call Clerk's API for each request. That can fail (e.g. timeout or missing/invalid `CLERK_SECRET_KEY`) and surface as an unhandled `HTTPError` and 500 response. If Clerk middleware still throws for any reason, the app catches it and continues without auth for that request instead of returning 500.

## Setting up Convex

- Set the `VITE_CONVEX_URL` and `CONVEX_DEPLOYMENT` environment variables in your `.env.local`. (Or run `npx convex init` to set them automatically.)
- Run `npx convex dev` to start the Convex server.

## Setting up Paddle (Season Pass)

This repo includes a starter Paddle integration for the 2026 season pass:

- `POST /api/paddle/checkout` creates a Paddle transaction and returns a hosted `checkoutUrl`.
- `POST /api/paddle/webhook` verifies webhook signatures and grants the season pass in Convex.
- `/pay` opens Paddle.js checkout from Paddle's `_ptxn` default payment link query parameter.
- The pricing page (`/pricing`) now calls the checkout endpoint for signed-in users.

Add these env vars:

```bash
VITE_PADDLE_CLIENT_TOKEN=...
PADDLE_API_KEY=...
PADDLE_SEASON_PASS_PRICE_ID=pri_...
PADDLE_WEBHOOK_SECRET=...
PADDLE_CONVEX_WEBHOOK_KEY=...
```

Dashboard setup checklist:

1. In Paddle, create the 2026 Season Pass product + price and copy the `price_id` to `PADDLE_SEASON_PASS_PRICE_ID`.
2. Set the Paddle Default Payment Link to `https://<your-domain>/pay`.
3. Create a client-side token in Paddle and set `VITE_PADDLE_CLIENT_TOKEN` (`test_...` in sandbox, `live_...` in production).
4. Add a webhook destination pointing to `https://<your-domain>/api/paddle/webhook`.
5. Subscribe to at least `transaction.completed`.
6. Copy that destination's endpoint secret into `PADDLE_WEBHOOK_SECRET`.
7. Set the same `PADDLE_CONVEX_WEBHOOK_KEY` in both:
   - your app runtime environment (`.env.local`, Cloudflare Pages, etc.)
   - your Convex deployment environment (`npx convex env set PADDLE_CONVEX_WEBHOOK_KEY ...` or Convex dashboard)
8. Test with Paddle sandbox first, then switch env vars to live credentials.

### Stable Local Webhook URL with Cloudflare Tunnel

To use a stable local webhook URL like `https://dev.grandprixpicks.com/api/paddle/webhook`:

1. Install cloudflared:
   - `brew install cloudflared`
2. One-time Cloudflare auth:
   - `cloudflared tunnel login`
3. Create tunnel:
   - `cloudflared tunnel create grandprixpicks-dev`
4. Route DNS hostname to tunnel:
   - `cloudflared tunnel route dns grandprixpicks-dev dev.grandprixpicks.com`
5. Run app + tunnel together:
   - `pnpm dev:public`

The tunnel command in `package.json` proxies `dev.grandprixpicks.com` to `http://localhost:3000`.

### Convex “Server Error” when called by client (e.g. on Cloudflare)

If you see `[CONVEX Q(...)] Server Error - Called by client`, Convex is failing to verify the Clerk JWT.

**Where to set what**

- **Cloudflare** (Pages → Settings → Environment variables): `CLERK_JWT_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CONVEX_URL`. These are for the app and Worker.
- **Convex** (Dashboard → your deployment → Settings → Environment Variables): `CLERK_JWT_ISSUER_DOMAIN` only. Convex runs on Convex’s servers, so this must be set in the Convex dashboard for the **same** deployment whose URL is in `VITE_CONVEX_URL`.

**Checklist**

1. **Convex Dashboard** → open the deployment that matches `VITE_CONVEX_URL` (e.g. `https://something.convex.cloud`) → **Settings** → **Environment Variables**. Confirm `CLERK_JWT_ISSUER_DOMAIN` is set there (not only in Cloudflare).
2. **Exact value**: In **Clerk Dashboard** → **JWT Templates** → “Convex” template, copy the **Issuer** URL. It must match exactly (e.g. `https://xxx.clerk.accounts.dev` for dev, or your production Clerk issuer). No trailing slash. If your app uses production Clerk, the issuer must be the production one.
3. **Convex Logs**: In Convex Dashboard → **Logs**, find the failed request (e.g. by Request ID). The log message usually says why JWT verification failed (e.g. issuer mismatch, invalid token).
4. After changing Convex env vars, wait a moment or trigger a redeploy so Convex picks them up; then reload the app.

## Setting up Sentry

[Sentry](https://sentry.io) is used for error monitoring and performance so you can see what’s failing in production. **Sentry is disabled outside production** (client uses `import.meta.env.PROD`, server uses `NODE_ENV === 'production'`; source map upload only runs for production builds).

1. **Create a project** at [sentry.io](https://sentry.io) (JavaScript / TanStack Start or React).
2. **Copy your DSN** from the project’s **Settings → Client Keys (DSN)** and set it in `.env.local`:
   - `VITE_SENTRY_DSN=https://…@….ingest.sentry.io/…`
3. **Optional but recommended** – for readable stack traces in Sentry, set:
   - `VITE_SENTRY_ORG` – your Sentry org slug
   - `VITE_SENTRY_PROJECT` – your Sentry project slug
   - `SENTRY_AUTH_TOKEN` – from [Sentry → Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/) (e.g. “Project: Read & Write”, “Release: Admin”).
     Then run builds with env loaded (e.g. `dotenv -e .env.local -- pnpm build:cf`) so the Sentry Vite plugin can upload source maps. Without these, errors will still be reported but stack traces may be minified.

Errors are reported from both the **client** (browser) and the **server** (via `instrument.server.mjs`). The client only initializes Sentry when `VITE_SENTRY_DSN` is set; the server logs a warning and skips Sentry if the DSN is missing.

For **Cloudflare Pages**, add `VITE_SENTRY_DSN` (and optionally `VITE_SENTRY_ORG`, `VITE_SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for source map uploads) to the project’s environment variables so production builds report to Sentry.

## Routing

This project uses [TanStack Router](https://tanstack.com/router). The initial setup is a file based router. Which means that the routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add another a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router';
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you use the `<Outlet />` component.

Here is an example layout that includes a header:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { Link } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
```

The `<TanStackRouterDevtools />` component is not required so you can remove it if you don't want it in your layout.

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/people',
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people');
    return response.json() as Promise<{
      results: {
        name: string;
      }[];
    }>;
  },
  component: () => {
    const data = peopleRoute.useLoaderData();
    return (
      <ul>
        {data.results.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    );
  },
});
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

### React-Query

React-Query is an excellent addition or alternative to route loading and integrating it into you application is a breeze.

First add your dependencies:

```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

Next we'll need to create a query client and provider. We recommend putting those in `main.tsx`.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ...

const queryClient = new QueryClient();

// ...

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
```

You can also add TanStack Query Devtools to the root route (optional).

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools />
    </>
  ),
});
```

Now you can use `useQuery` to fetch your data.

```tsx
import { useQuery } from '@tanstack/react-query';

import './App.css';

function App() {
  const { data } = useQuery({
    queryKey: ['people'],
    queryFn: () =>
      fetch('https://swapi.dev/api/people')
        .then((res) => res.json())
        .then((data) => data.results as { name: string }[]),
    initialData: [],
  });

  return (
    <div>
      <ul>
        {data.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

You can find out everything you need to know on how to use React-Query in the [React-Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview).

## State Management

Another common requirement for React applications is state management. There are many options for state management in React. TanStack Store provides a great starting point for your project.

First you need to add TanStack Store as a dependency:

```bash
pnpm add @tanstack/store
```

Now let's create a simple counter in the `src/App.tsx` file as a demonstration.

```tsx
import { useStore } from '@tanstack/react-store';
import { Store } from '@tanstack/store';
import './App.css';

const countStore = new Store(0);

function App() {
  const count = useStore(countStore);
  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
    </div>
  );
}

export default App;
```

One of the many nice features of TanStack Store is the ability to derive state from other state. That derived state will update when the base state updates.

Let's check this out by doubling the count using derived state.

```tsx
import { useStore } from '@tanstack/react-store';
import { Store, Derived } from '@tanstack/store';
import './App.css';

const countStore = new Store(0);

const doubledStore = new Derived({
  fn: () => countStore.state * 2,
  deps: [countStore],
});
doubledStore.mount();

function App() {
  const count = useStore(countStore);
  const doubledCount = useStore(doubledStore);

  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
      <div>Doubled - {doubledCount}</div>
    </div>
  );
}

export default App;
```

We use the `Derived` class to create a new store that is derived from another store. The `Derived` class has a `mount` method that will start the derived store updating.

Once we've created the derived store we can use it in the `App` component just like we would any other store using the `useStore` hook.

You can find out everything you need to know on how to use TanStack Store in the [TanStack Store documentation](https://tanstack.com/store/latest).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).
