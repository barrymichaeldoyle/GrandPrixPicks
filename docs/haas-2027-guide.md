# Haas 2027 seat guide

Permanent URL: `/guides/f1-2027-haas-second-seat`.

Content: `apps/web/src/lib/guides.ts`. SEO front matter:
`apps/web/src/lib/guideMeta.ts`. The guide registry supplies the index,
sitemap, related-guide links and generated Open Graph card.

Read-mode extension of the existing guide layout: title, summary, dated
decision status, credited Monza photo, sourced introduction, a section on why
Bearman is not in the contest, five flat driver cards each with a credited
square portrait, announcement status. Inherit Archivo, semantic colours and
existing reading widths; stack the same content on phones. No new visual
system.

The Bearman section exists to separate what Haas announced from what is
reported. Haas's July 2024 release says "multi-year contract beginning with the
2025 season" and names no end year; the 2026 expiry and the 2027 option are
PlanetF1's reporting, attributed as such. Keep that split if the section is
revised: it is the only part of the page where a reader could otherwise take a
report for an announcement.

The shared guide renderer accepts optional `status` and `hero` fields, plus
`card`, `image` and `sources` on sections. A section `image` renders as a
square-cropped thumbnail floated beside the heading, with the photographer and
licence as links directly under it: the CC BY-SA files are only licensed while
that attribution renders. The photo includes dimensions, alt text,
caption, credit and licence links. Driver panels keep their source links
beside the relevant claims. These are optional guide composition features;
the existing `DESIGN.md` remains the visual authority.

Finish review: ship, with no material or minor findings. Review captures:
`.impeccable/review/haas-mobile.png` (390px) and
`.impeccable/review/haas-desktop.png` (1440px).

## When Haas announces

1. Verify the official Haas announcement and link it in the opening section.
2. Update the status, title, summary and search description to name the chosen
   driver. Keep this slug, the original publication date and canonical URL.
3. Set `updatedAt` to the date of the substantive revision.
4. Retain the five cards as the dated shortlist considered before the decision.
5. Replace the pending announcement paragraph with the outcome and source.

This is an editorial update checklist, not an automated announcement monitor.

## Social follow-up draft

Who should partner Oliver Bearman at Haas in 2027?

- Esteban Ocon
- Jack Doohan
- Ryo Hirakawa
- Rafael Câmara
- Leonardo Fornaroli

Keep all five names. Confirm the selected social platform supports five poll
options before scheduling; do not silently remove a candidate. Game promotion
stays in the bio. Nothing has been sent to Buffer or GPP Social.

The existing Top 5 and teammate picks predict session results, not future seats.
They cannot express this five-driver choice, so no in-app poll was added.
