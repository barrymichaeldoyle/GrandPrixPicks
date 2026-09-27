# Formula 1 Race Weekend for TRMNL

Follow the Formula 1 race weekend on a TRMNL display: session times in your
time zone, weather forecasts, practice and qualifying results, the confirmed
starting grid, race results, and weekend news. Between seasons, see the
championship standings. Choose metric or imperial units. No account required.

From [GrandPrixPicks.com](https://grandprixpicks.com).

**[Preview the screens](https://grandprixpicks.com/trmnl)** on TRMNL OG and
TRMNL X, in landscape or portrait, with different palettes and headline counts.
The plugin has not yet been published as a public Recipe.

## Source files

| File                                                     | Purpose                                               |
| -------------------------------------------------------- | ----------------------------------------------------- |
| [src/full.liquid](src/full.liquid)                       | Full-screen layout                                    |
| [src/half_horizontal.liquid](src/half_horizontal.liquid) | Top or bottom half                                    |
| [src/half_vertical.liquid](src/half_vertical.liquid)     | Left or right half                                    |
| [src/quadrant.liquid](src/quadrant.liquid)               | Quarter-screen layout                                 |
| [src/shared.liquid](src/shared.liquid)                   | Shared Liquid templates, used by every layout         |
| [src/settings.yml](src/settings.yml)                     | Polling configuration, units selector, and About text |
| [.trmnlp.yml](.trmnlp.yml)                               | Local preview configuration                           |

This directory contains the display templates. The data endpoint lives in the
same monorepo:

- [Polling endpoint](../web/server/routes/api/trmnl/weekend.get.ts)
- [Payload builder](../web/src/lib/trmnl/payload.ts)
- [Preview renderer](../web/src/lib/trmnl/render.ts)
- [Product specification and publishing notes](../../docs/trmnl-plugin-specification.md)

TRMNL polls this public URL and renders the JSON with these Liquid templates:

```text
https://grandprixpicks.com/api/trmnl/weekend?tz={{ trmnl.user.time_zone_iana }}&locale={{ trmnl.user.locale }}&units={{ units }}
```

## Preview and validation

The website preview renders these same Liquid files. With the monorepo's
development environment configured, run `pnpm dev` from the repository root
and open `http://localhost:3000/trmnl`.

Run the renderer tests from the repository root:

```sh
pnpm --filter @grandprixpicks/web test src/lib/trmnl/render.test.ts
```

For TRMNL's local tooling, see [trmnlp](https://github.com/usetrmnl/trmnlp).
Run it from this directory so it finds `.trmnlp.yml` and `src/`.
Check the final result in TRMNL's own preview and on a device as well.

## Keeping TRMNL in sync

GitHub Sync is not connected yet. The private plugin's markup is currently
updated manually from this directory; the About text comes from the
`custom_fields` block in `src/settings.yml`.

TRMNL supports a subdirectory in an existing repository. If connecting it,
choose:

- **Repository:** `barrymichaeldoyle/GrandPrixPicks`
- **Folder in the repository:** `apps/trmnl` (not `apps/trmnl/src`)

TRMNL appends `src/` to that folder. Saving in TRMNL automatically creates a
GitHub commit; a push to GitHub makes an import available in TRMNL, but does
not automatically update the plugin. See the
[official GitHub Sync guide](https://help.trmnl.com/en/articles/15977899-github-sync).

Keep changes in the repo first, review them in the preview, then import them
into TRMNL. After an edit made in TRMNL, pull its generated commit before
making further local changes. GitHub Sync covers the plugin files; it does
not deploy the website or its polling endpoint.

## Source availability

The source is public for reference under the repository's
[existing license](../../LICENSE). It is source-available, not currently
licensed as open source. A public GitHub repository or a GitHub Sync
connection does not change those permissions.

For plugin questions, contact [barry@barrymichaeldoyle.com](mailto:barry@barrymichaeldoyle.com).
