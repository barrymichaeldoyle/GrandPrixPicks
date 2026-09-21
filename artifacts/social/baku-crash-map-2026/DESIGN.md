---
name: Baku crash map posters
description: Visual specification for this static social campaign only.
colors:
  charcoal: '#101113'
  chartreuse: '#d4ff3f'
  off-white: '#f2f2f0'
  muted: '#a7a8ad'
  track: '#4a4c3c'
---

## Overview

A poster that reads at thumbnail size: the race name, one fact, the lap, and
two numbers. Anything a reader has to lean in for belongs in the caption.

## Colours

Chartreuse is the Baku title and the incident dots, and nothing else. The two
numerals are off-white so they don't compete with the title. Corner labels
and the URL are muted. The track is one flat olive; an earlier two-tone track
read as sectors that meant nothing.

## Typography

Local Archivo, weights 600 and 900. "Baku" is 320px portrait / 250px
landscape, weight 900, tight tracking. The fact line is 54px / 50px, weight 600. Corner numerals are 150px, weight 900, with a small muted "Turn N" above.

## Layout

Instagram (1080×1350): title, fact line, then the map across the full width.
Turn 3's number sits left of its dot; Turn 15's goes under its dot, because
track runs on both sides of it. URL bottom right.

X (1600×900): title and fact line top left, map on the right. Both numbers sit
left of their dots, in open space. URL bottom right, since X's ALT badge covers
the lower left.

## Components

Exact `bakuCircuitGeometry.ts` geometry and the page's own marker placement
and radius, so the poster and the write-up cannot disagree. Dots are sized by
count. Start/finish mark and lap direction are kept: without them the
drawing is a shape, not a circuit. No leader lines.

## Don'ts

No legend, subtitle, date line, driver key, rule or fine print on the image.
No decoration, architecture or generated imagery. Don't crop one format into
the other, and don't describe incidents as crashes or blame.
