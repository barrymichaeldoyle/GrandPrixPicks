# Grand Prix Picks News

Posts Formula 1 news to r/GPPicks.

## What it does

Grand Prix Picks (grandprixpicks.com) is a Formula 1 prediction game. Its
editors publish short news items during a race weekend: grid penalties, driver
changes, upgrades, results. Each item has a headline, a two or three sentence
summary, and a link to the article it came from.

This app posts each item to the subreddit it is installed in:

- a link post to the original article, titled with the headline;
- a first comment with the summary, pinned to the top of the post.

It checks for new items every 10 minutes and posts at most 5 at a time. When
an item's summary is corrected, it edits the comment. When the headline or
link is corrected, it deletes the post and posts it again, because Reddit
does not allow either to be edited. When an item is withdrawn, it deletes the
post.

It is for the moderators of r/GPPicks, the Grand Prix Picks community. It
does not read or store anything about Reddit users, and it has no settings.

## Data

The app fetches `https://grandprixpicks.com/api/news/recent`, a public list of
the site's news from the last 14 days. It sends nothing to that address.

It stores, in the app's Redis, which Reddit post and comment it made for each
news item, so it can edit or delete them later. It forgets an item a week
after it was published.

- Terms of service: https://grandprixpicks.com/terms
- Privacy policy: https://grandprixpicks.com/privacy

## Setup

1. Install the app on the subreddit.
2. Make the app account a moderator with the Posts permission, so it can pin
   the summary comment. Without it, the summary still posts, unpinned.

The first run posts only items from the last 24 hours, so installing the app
does not post two weeks of news at once.

## Support

Contact the moderators of r/GPPicks, or https://grandprixpicks.com/support.
