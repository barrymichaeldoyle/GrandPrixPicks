import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RaceEventPageLayout } from './RaceEventPageLayout';

vi.mock('@/components/RaceDetailHeader', () => ({
  RaceDetailHeader: () => <h1>Race</h1>,
}));
vi.mock('@/components/WeekendScheduleList', () => ({
  WeekendScheduleList: () => <section>Schedule</section>,
}));

function pageProps(): ComponentProps<typeof RaceEventPageLayout> {
  return {
    race: { status: 'upcoming' } as ComponentProps<
      typeof RaceEventPageLayout
    >['race'],
    isNextRace: true,
    isPredictable: true,
    viewer: { isSignedIn: false, isAuthLoaded: true },
    isPredictionsLoading: false,
    weekendStatus: {
      hasPredictions: false,
      hasH2HPredictions: false,
      hasPublishedResults: false,
      allEventsScored: false,
      pointsSoFar: 0,
      scoredEventCount: 0,
    },
    schedule: {
      weekendSessions: ['quali', 'race'],
      trackTimeZone: 'UTC',
      getStartAt: () => 0,
      getLockAt: () => 0,
      isPublished: () => false,
    },
    selectedSession: 'quali',
    onSelectedSessionChange: () => {},
    sessionTabOptions: [],
    showSessionTabs: false,
    writeupContent: <section>Write-up</section>,
    initialTop5Content: <section>Start picks</section>,
    top5MainContent: <section>Try picks</section>,
    h2hContent: null,
    h2hResultsContent: <section>Published results</section>,
  };
}

describe('open race page priorities', () => {
  it('places the signed-out pick entry before the schedule and write-up', () => {
    const html = renderToStaticMarkup(<RaceEventPageLayout {...pageProps()} />);
    expect(html.indexOf('Try picks')).toBeLessThan(html.indexOf('Schedule'));
    expect(html.indexOf('Schedule')).toBeLessThan(html.indexOf('Write-up'));
  });

  it('keeps the initial signed-in entry before reference content', () => {
    const props = pageProps();
    props.viewer.isSignedIn = true;
    const html = renderToStaticMarkup(<RaceEventPageLayout {...props} />);
    expect(html.indexOf('Start picks')).toBeLessThan(html.indexOf('Schedule'));
    expect(html.indexOf('Schedule')).toBeLessThan(html.indexOf('Write-up'));
  });

  it('shows a published session result while later sessions remain open', () => {
    const props = pageProps();
    props.weekendStatus.hasPublishedResults = true;
    props.schedule.isPublished = () => true;
    const html = renderToStaticMarkup(<RaceEventPageLayout {...props} />);
    expect(html).toContain('Published results');
    expect(html).not.toContain('Try picks');
  });

  it('places published results above the report and write-up on a finished race', () => {
    const props = pageProps();
    props.race.status = 'finished';
    props.isPredictable = false;
    props.weekendStatus.hasPublishedResults = true;
    props.schedule.isPublished = () => true;
    props.raceReportContent = <p>Race report</p>;
    const html = renderToStaticMarkup(<RaceEventPageLayout {...props} />);
    expect(html.indexOf('Published results')).toBeGreaterThan(-1);
    expect(html.indexOf('Published results')).toBeLessThan(
      html.indexOf('Race report'),
    );
    expect(html.indexOf('Published results')).toBeLessThan(
      html.indexOf('Write-up'),
    );
  });
});
