# IOS App Issues

My goal is to make the signed in experience on iOS app feel more like the good things we've done on web.

## Redundant Picks Tab

I think the Picks tab is unnecessary and we should rather incorporate picks into the home page. In a similar way we can match home more by putting notifications (ditch it from the top corner) as it's own tab (show counts on there if we have new notifications). Obviously keep leagues out for now since that it not apart of the mobile MVP. So this will be unnecessary for both signed in and signed out views.

## Home page

We should try match the web apps signed in home page for signed in users. Give a good hero section with the slanted line vibe. Add details like the weather, show my existing picks. If the user wants to update their picks (or add their picks) it should be it's own focused page/modal vibe (like we do on web). Same vibes for the H2H picks, if it's first picks, do the full screen flow. If it's just updating one existing H2H pick open just the single picker. Try show confetti like we do for web when making picks (in fact every time a pick saves we should throw confetti to make the user feel like their action worked). Also use the alternating slanted line vibes for the news items like we do on web.

The race weekend results on the feed feel quite dull and need to be more colorful to match web too.

## Leaderboard

This page mostly looks good. We should ensure that the round picker defaults to being full scrolled to the right so that we can see the selected round.

Ditch "THE CHASING PACK".

When you see "Italian Grand Prix . combined" it should have the italian flag next to it (do this for all countries)

Ditch the "Combined/Top 5/H2H", we'll only show combined. No need to state combined anymore either. Basically less is more vibes here.

We should use sharp edge (not rounded) for those top 3 and apply the same slanted line vibe for 1st, 2nd, 3rd, lines.

## Layout

Tab roots carry a compact 44pt chrome (`TabChrome` in
`CollapsingChrome`): brand mark + wordmark on Home, the screen name on the
others. Scrolling down hides it and reclaims the space; scrolling up brings
it back. Pushed screens keep the native stack header.