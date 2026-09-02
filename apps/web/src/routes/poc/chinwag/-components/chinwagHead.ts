/**
 * Head tags shared by both of the poll's pages.
 *
 * The icons matter more than they look. This page is built to sit on his
 * hostname, and the root layout's icons are the Grand Prix Picks chartreuse
 * wordmark — which would put our brand in the tab of his page. He has not set a
 * favicon on his own site (it still serves the Squarespace default), so there
 * was nothing of his to borrow and the poll gets its own, in his palette.
 *
 * Route head tags are appended after the root's, and the last icon link wins,
 * so these override rather than duplicate.
 */
export function chinwagHead(title: string) {
  return {
    meta: [
      { title },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'theme-color', content: '#fdeded' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/chinwag/favicon.svg' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/chinwag/favicon-32.png',
      },
      { rel: 'apple-touch-icon', href: '/chinwag/apple-touch-icon.png' },
    ],
  };
}
