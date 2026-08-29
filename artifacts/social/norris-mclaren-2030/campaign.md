# Norris re-signs with McLaren to 2030

A single-post announcement for 29 August 2026, the day McLaren confirmed the
deal. Facts and wording were checked on 29 August 2026.

Deliberately its own campaign rather than a beat in
`monza-news-roundup-2026`. A contract that starts in 2028 is not Monza news:
it does not change a driver, a car or a session at the Italian Grand Prix, and
folding it into the roundup would have implied it did. The same reasoning keeps
it out of `raceNews` in the app, where `affectsSessions` has no honest answer
for it. It does appear as prose on the Monza write-up page, which is the
surface for context that is interesting without being actionable.

## Voice

- Report the deal, do not celebrate it. We are not McLaren's press office.
- Only what the primary source says. No transfer-fee figures: the widely quoted
  120m is tabloid reporting and is not in the Formula 1 announcement.
- No hashtags on X. A short set on Instagram.
- End on a question rather than a call to action. The card already carries the
  domain.

## Format

No carousel. One story with three facts does not fill six slides, and padding
it out would be obvious. One asset per channel, matching the Dutch GP community
picks campaign:

| Channel   | Asset                             | Size      |
| --------- | --------------------------------- | --------- |
| Instagram | `norris-mclaren-2030-instagram.png` | 1080x1350 |
| X         | `norris-mclaren-2030-x.png`         | 1600x900  |

Rendered from design tokens, not collage art:
`pnpm --filter @grandprixpicks/web social-card norris-mclaren-2030`. This is a
facts-and-figures story, which is the case the Dutch GP card established;
`render-monza-news-roundup.mts` remains the route for a story that wants
illustration, and needs hand-made source art.

The X card's call to action is right-aligned because X draws its ALT badge over
the lower-left corner of an image.

## X

> Lando Norris has signed a new McLaren deal to at least the end of 2030, with
> a multi-year option beyond it ✍️
>
> He joined the team in 2017, and Oscar Piastri is contracted to 2028, so the
> papaya line-up is settled for a while yet.
>
> Does that make McLaren the team to beat?

No hashtags, no link, no first-reply link.

## Instagram

> Lando Norris is staying at McLaren ✍️
>
> A new deal keeps him at the team until at least the end of 2030, with a
> multi-year option beyond that. He joined McLaren in 2017 as a test and
> development driver and has raced for them since 2019.
>
> Oscar Piastri is contracted to the end of 2028, so the papaya line-up is
> settled for a while yet.
>
> Does that make McLaren the team to beat?
>
> #F1 #LandoNorris #McLaren

## Alt text

Both assets:

> Grand Prix Picks card reading "Norris re-signs with McLaren to 2030." A new
> deal keeps Lando Norris at McLaren until at least the end of 2030, with a
> multi-year option beyond it. Signed until end of 2030, Piastri until end of
> 2028, at McLaren since 2017.

## Sources checked on 29 August

- Formula 1: the announcement, the multi-year option, Norris joining in 2017
  and racing from 2019, and Piastri contracted through 2028 —
  https://www.formula1.com/en/latest/article/lando-norris-commits-future-to-mclaren-as-he-signs-new-deal-until-the-end-of-2030.7ErHTktjoW2mAo5zEEtuA0
- RaceFans, as a second source on the term —
  https://www.racefans.net/2026/08/29/norris-extends-mclaren-contract-until-2030/

## Notes for future assets

- A single-post campaign still gets a `campaign.md`. The Norris drafts existed
  in Buffer for an hour with no campaign record, and nothing outside Buffer
  said what they were or why.
- Check the most recent `campaign.md` before writing copy. The hashtag rule was
  already written down in `monza-news-roundup-2026` on 28 August and was missed
  here on 29 August, because a stale note was trusted over the repo.
