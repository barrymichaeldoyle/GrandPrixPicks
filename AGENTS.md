<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Product Voice

Before writing or changing any user-facing copy, read
`docs/product-voice.md`. Treat its rules and examples as acceptance criteria.
Do not invent helper text, headings, taglines, or explanatory prose unless the
feature requires them.

## News editorial direction

When changing news discovery, publication, feeds or news notifications, read
`docs/automated-news-pipeline.md` alongside `docs/race-news.md` and
`docs/notifications.md`. Reviewed general Formula 1 news may belong in the feed
without changing a pick. Keep pick-related news identifiable so people can opt
for pick-related pushes or all selected news. The current pick-only `raceNews`
constraint is implementation history, not the product rule.

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
