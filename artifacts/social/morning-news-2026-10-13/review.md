# News check — 13 October 2026

Checked all eight discovery feeds (283 items), including the unfiltered scan,
against existing Singapore, Bahrain, Austin and global production news. Read
the full source text for the selected stories and checked Haas's live news page.

Created three general news items on production `cheery-tern-274`:

- **Câmara's reported Haas agreement:** RacingNews365's 11 October report says
  Haas and Ferrari agreed the move in Singapore, with a formal announcement
  expected this week. Haas's news page still ends with its Singapore race
  recap. The card and X copy attribute the report; neither calls it an official
  announcement. Published globally under `camara-haas-2027-seat`.
- **McLaren's phased upgrades:** Stella describes upgrades intended to restore
  podium contention and test aerodynamic concepts for 2027. No gain or victory
  is presented as guaranteed. Published globally.
- **Hart's race-engineer outings:** Red Bull confirmed to Motorsport.com that
  Tom Hart will engineer Verstappen in Austin, Brazil and Las Vegas, with
  Lambiase attending as Head of Racing. Published under Austin; the permanent
  handover date remains unannounced.

All three have no affected scoring sessions. Existing Singapore recovery,
puncture, title, medical, technical and sprint-collision stories were not
duplicated. The Imola calendar report remains held: it conflicts with the
existing sourced confirmation and the live official calendar, which still
lists Qatar and Abu Dhabi. Commentary, rankings and party footage were not
selected. No push notification was selected.

The global publication function has no dry-run argument. Its two payloads were
reviewed locally against its validation rules and checked for existing keys;
the Austin item passed the production dry run. Source timestamps were checked
as UTC ISO dates before applying. All three exact headlines, bodies and source
URLs were verified through the public `/api/news/recent` response. Austin's
story also renders on its live write-up page.

The pending X check was previewed and applied; previous posts reconciled as
sent, with no stale cancellations. Three X posts were previewed, scheduled
through Buffer, and read back by the social CLI:

- Câmara: **08:15 SAST** (06:15 UTC).
- Hart: **08:40 SAST** (06:40 UTC).
- McLaren: **09:05 SAST** (07:05 UTC).

The publication batch, X selection and updated shared ledger are retained.
First-publication Discord and Reddit distribution follows the
[publish-race-news workflow](../../../.claude/skills/publish-race-news/SKILL.md).
