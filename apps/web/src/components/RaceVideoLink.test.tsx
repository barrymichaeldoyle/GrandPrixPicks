import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RaceVideoLink } from './RaceVideoLink';
import { RaceVideoLinks } from './RaceVideoLinks';
import { PracticeResultsPanel } from './PracticeResultsCard';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { useQuery } from '@/integrations/convex/query';

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: vi.fn() }));
vi.mock('@/integrations/convex/query', () => ({ useQuery: vi.fn() }));
let container: HTMLDivElement | undefined;
let root: Root | undefined;
function render(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(node));
  return container;
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.clearAllMocks();
});

describe('official video links', () => {
  it('opens the watch page in a new tab and tracks the selected session', () => {
    const node = render(
      <RaceVideoLink
        kind="fp2"
        videoId="7QC7-5jWriI"
        raceSlug="azerbaijan-2025"
      />,
    );
    const link = node.querySelector('a')!;
    expect(link.href).toBe('https://www.youtube.com/watch?v=7QC7-5jWriI');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toContain('opens in a new tab');
    act(() => link.click());
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('race_video_clicked', {
      video_id: '7QC7-5jWriI',
      video_kind: 'fp2',
      race_slug: 'azerbaijan-2025',
    });
  });

  it('hides missing and malformed IDs', () => {
    expect(
      render(
        <>
          <RaceVideoLink kind="fp1" videoId={undefined} />
          <RaceVideoLink kind="fp1" videoId="https://evil.example" />
        </>,
      ).innerHTML,
    ).toBe('');
  });

  it('shows only the relevant session in a feed group and keeps practice out of the article links', () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: '1', kind: 'fp2', videoId: '7QC7-5jWriI' },
      { _id: '2', kind: 'race', videoId: 'S-LMSpzlnc0' },
      { _id: '3', kind: 'radio', videoId: '8Vq9dmysOmA' },
    ]);
    const node = render(
      <RaceVideoLinks raceSlug="abu-dhabi-2025" kind="race" />,
    );
    expect(node.querySelectorAll('a')).toHaveLength(1);
    expect(node.textContent).toBe('Watch race highlights');
    act(() => root!.render(<RaceVideoLinks raceSlug="abu-dhabi-2025" />));
    expect(
      [...node.querySelectorAll('a')].map((link) => link.textContent),
    ).toEqual(['Watch race highlights', 'Watch Radio Rewind']);
    vi.mocked(useQuery).mockReturnValue([]);
    act(() => root!.render(<RaceVideoLinks raceSlug="abu-dhabi-2025" />));
    expect(node.innerHTML).toBe('');
  });

  it('changes the highlights link with the timing-sheet tab', () => {
    const node = render(
      <PracticeResultsPanel
        results={[
          {
            sessionType: 'fp1',
            publishedAt: 1,
            entries: [],
            highlightsVideoId: '7QC7-5jWriI',
          },
          {
            sessionType: 'fp2',
            publishedAt: 2,
            entries: [],
            highlightsVideoId: '8Vq9dmysOmA',
          },
        ]}
      />,
    );
    expect(node.querySelector('a')?.textContent).toBe('Watch FP1 highlights');
    const fp2 = [...node.querySelectorAll('button')].find(
      (button) => button.textContent === 'FP2',
    )!;
    act(() => fp2.click());
    expect(node.querySelector('a')?.href).toBe(
      'https://www.youtube.com/watch?v=8Vq9dmysOmA',
    );
    expect(node.querySelector('a')?.textContent).toBe('Watch FP2 highlights');
  });
});
