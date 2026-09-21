---
name: Baku crash map posters
description: Visual specification for this static social campaign only.
colors:
  charcoal: '#101113'
  chartreuse: '#d4ff3f'
  off-white: '#f2f2f0'
  muted: '#a7a8ad'
  track-base: '#616448'
  track-active: '#879b38'
  footer-rule: '#61635c'
---

## Overview

One poster combines circuit incidents and driver involvement. The race-week artwork supplies the oversized mixed-case Baku title and palette; this campaign uses a plain ground and prioritizes data clarity.

## Colors

Chartreuse identifies Baku, incident markers and counts; off-white carries headings, driver names and lap direction. Muted text holds dates and qualifications. Olive distinguishes the circuit from its markers.

## Typography

Local Archivo at weights 400, 600 and 900. Baku is 300px in portrait and 226px in landscape, weight 900, tracking −9px. Crash map is 73px/66px, weight 600, tracking −2px. Large driver counts establish grouped rows; supporting text remains quieter.

## Layout

Compose Instagram at 1080×1350 and X at 1600×900 independently. Portrait places drivers in the negative space right of the lower circuit; landscape places the driver list left and circuit right. Content and footer align around 65px side insets. A fine bottom rule separates website attribution and archive qualification.

## Elevation & Depth

Flat charcoal, without shadows, cards, architectural imagery or generated assets.

## Components

Use exact `bakuCircuitGeometry.ts` geometry and shared marker placement/radius logic. Size dots by incident count, retain start/finish and direction, and annotate the three highest-count corners with leaders anchored to their actual locations. Show raw counts. Group every driver with at least four involvements by count, retaining all ties; the current rows are 6, 5 and 4. Attribution is website-only.

## Do's and Don'ts

Do reproduce with `pnpm --filter @grandprixpicks/web social-baku-crash-map` from the repository root. `apps/web/scripts/render-baku-crash-map.mts` uses local fonts, Satori and Resvg to export both PNGs here and identical public copies. Data comes from `bakuCrashes.ts` and `bakuCrashMapModel.ts`; scope and captions live in `campaign.md`.
Do inspect both exports after regeneration. Preserve the curated-archive qualification and unplaced count. Don't redraw geometry by eye, crop one format into the other, add decoration, or describe driver involvement as responsibility.
