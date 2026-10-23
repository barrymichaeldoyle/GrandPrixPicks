import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, formatStats, socialStats } from './social-stats.mjs';

const m = (impressions, reactions = 0) => [
  { type: 'impressions', value: impressions },
  { type: 'reactions', value: reactions },
  { type: 'reposts', value: 0 },
  { type: 'comments', value: 0 },
  { type: 'clicks', value: 0 },
];

test('classifies posts by what Buffer kept of them', () => {
  assert.equal(classify({ text: 'Story https://x.y/z' }), 'link');
  assert.equal(classify({ text: 'Story' }), 'text');
  assert.equal(
    classify({
      text: 'Story',
      assets: [{ source: 'https://grandprixpicks.com/og/news?race=a&story=b' }],
    }),
    'news card',
  );
  assert.equal(
    classify({
      text: 'Result',
      assets: [
        { image: { url: 'https://grandprixpicks.com/og/results?race=a' } },
      ],
    }),
    'results',
  );
  assert.equal(
    classify({ text: 'Quote', metadata: { retweet: { id: '1' } } }),
    'quote',
  );
});

test('aggregates sent posts per class and lists the top three', async () => {
  const pages = [
    {
      items: [
        {
          id: '1',
          text: 'A https://x.y',
          sentAt: '2026-10-20T10:00:00Z',
          metrics: m(30),
        },
        {
          id: '2',
          text: 'B https://x.y',
          sentAt: '2026-10-21T10:00:00Z',
          metrics: m(50, 1),
        },
      ],
      pageInfo: { hasNextPage: true, endCursor: 'c1' },
    },
    {
      items: [
        {
          id: '3',
          text: 'Singapore GP qualifying: Verstappen on pole.',
          sentAt: '2026-10-22T10:00:00Z',
          metrics: m(140, 2),
          assets: [
            {
              source:
                'https://grandprixpicks.com/og/results?race=singapore-2026&session=quali',
            },
          ],
        },
      ],
      pageInfo: { hasNextPage: false },
    },
  ];
  const calls = [];
  const stats = await socialStats({
    organizationId: 'org',
    channelId: 'x',
    days: 30,
    now: Date.parse('2026-10-23T12:00:00Z'),
    buffer: async (command, payload, options) => {
      calls.push({ command, payload, options });
      return pages[options.after ? 1 : 0];
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].payload.filter.dueAt.start, '2026-09-23T12:00:00.000Z');
  assert.equal(stats.posts, 3);
  assert.deepEqual(
    stats.rows.map((row) => [
      row.kind,
      row.posts,
      row.medianImpressions,
      row.likes,
    ]),
    [
      ['results', 1, 140, 2],
      ['link', 2, 40, 1],
    ],
  );
  assert.equal(stats.top[0].impressions, 140);
  assert.match(formatStats(stats), /results\s+1\s+140/);
});
