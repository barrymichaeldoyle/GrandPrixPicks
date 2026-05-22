<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Expo Mobile App

This monorepo includes a WIP Expo app under `apps/mobile`.

When working on the mobile app, use the installed Expo agent skills in
`.agents/skills`, especially:

- `building-native-ui` for Expo Router UI, navigation, styling, native tabs,
  animations, media, storage, and mobile interaction patterns.
- `native-data-fetching` for fetch/API work, React Query/SWR patterns, caching,
  offline behavior, and Expo Router loaders.
- `upgrading-expo` for Expo SDK upgrades and dependency compatibility.
- `expo-dev-client` when Expo Go is not enough and a development build is
  required.
- `expo-deployment` and `expo-cicd-workflows` for EAS build, submit, hosting,
  and workflow changes.
- `expo-api-routes`, `expo-module`, `expo-tailwind-setup`, and `use-dom` when a
  task specifically touches those areas.
