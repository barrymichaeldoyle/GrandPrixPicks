# Singapore news sweep — 9 October 2026

Reviewed and published on production `cheery-tern-274` at approximately
18:13 UTC. The publish payload is
`singapore-2026-2026-10-09-evening-sweep.json`.

## Published

Six existing stories were updated in place:

- Verstappen's yellow-flag investigation: a breach was found, but no penalty
  was imposed. His sprint pole stands; the card no longer says a verdict is
  pending.
- Sprint qualifying: replaced the provisional wording with the FIA's final
  classification, document 32.
- Mercedes' upgrade findings: Antonelli cannot revert the full package this
  weekend. This is now pick-related for the sprint, qualifying and race,
  following confirmation that the package will stay on his car.
- Norris's straight-line speed issue: Friday's report describes progress,
  with the team still checking the data. It does not claim the fault has been
  conclusively cured.
- Hülkenberg's practice stoppage: Audi repaired the gearbox issue before
  sprint qualifying, where he finished 12th.
- The SQ1 Overtake Mode error: added the separate timing-system problem from
  the same source. The affected session remains sprint qualifying.

Three general stories were created:

- Hadjar's reported engine trouble and handling difficulties in SQ3.
- Hamilton's rear-grip difficulties on soft tyres and his run-plan choice.
- Pirelli's assessment that both medium and soft tyres are viable for the
  sprint, with warm-up a significant factor in Friday's qualifying.

No editorial push campaign was selected. New feed cards use the existing
Discord and Reddit distribution workflow.

## Coverage and source review

The normal scan checked 282 items across all eight configured feeds, covering
the period from 8 October at 14:25 UTC. A second scan with `--all` checked
developments hidden by headline-overlap filtering, including the Verstappen
verdict and Antonelli's inability to revert his package.

Read the full articles linked in the payload. Also checked the FIA's Singapore
document listing and read documents 29–32: Verstappen's ruling, yellow-flag
lap deletions, Safety Car line-time review and final sprint qualifying
classification. The other reviewed rulings did not change the final order or
require another card. No sprint grid was stored in the Grand Prix
`startingGrid` field.

Event coverage was checked alongside sporting news. Singapore's Audi livery,
Williams team kit, Albon helmet and Bottas cycling story were already active;
no duplicate event cards were added. The global publication list was checked
as well: the FIA's 2027 rear-wing limit and Racing Bulls' driver-decision
timeline were already published. Repeated upgrade commentary, broadcast
schedules and reports that added no material development were left out.

## Validation

- All nine production dry runs passed, with six updates and three creates.
  Source timestamps matched the articles' metadata or the FIA document's
  Singapore-local timestamp.
- Post-publication reads verified all nine headlines, bodies, source URLs,
  source dates, categories and affected sessions against the payload.
- Active Singapore stories increased from 28 to 31. The six updated items
  retained their original publication timestamps.
- JSON formatting passed. `pnpm copy:audit` completed with five existing
  warnings in unchanged web files; the new editorial copy was reviewed
  against `docs/product-voice.md`.
- No application code changed. Existing mobile, TRMNL and other workspace
  edits, including the earlier untracked post-sprint-qualifying batch, were
  left outside this commit.
