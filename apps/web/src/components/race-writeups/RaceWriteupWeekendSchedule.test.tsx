import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { resetSessionTimeView } from '@/lib/sessionTimeView';

import { RaceWriteupWeekendSchedule } from './RaceWriteupWeekendSchedule';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** A zone the test runner is definitely not in, so the toggle has a job. */
const DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const FOREIGN_ZONE = DEVICE_ZONE === 'Asia/Tokyo' ? 'UTC' : 'Asia/Tokyo';

describe('RaceWriteupWeekendSchedule', () => {
  it('shows the sprint sessions instead of unused practice slots', () => {
    const html = renderToStaticMarkup(
      <RaceWriteupWeekendSchedule
        race={{
          hasSprint: true,
          fp1StartAt: Date.parse('2026-10-09T08:30:00Z'),
          sprintQualiStartAt: Date.parse('2026-10-09T12:30:00Z'),
          sprintStartAt: Date.parse('2026-10-10T09:00:00Z'),
          qualiStartAt: Date.parse('2026-10-10T13:00:00Z'),
          raceStartAt: Date.parse('2026-10-11T12:00:00Z'),
        }}
        timeZone="Asia/Singapore"
        timeZoneLabel="SINGAPORE TIME"
      />,
    );

    expect(html).toContain('Sprint Qualifying');
    expect(html).toContain('>Sprint</dt>');
    expect(html).toContain('Fri 9 Oct, 20:30 GMT+8');
    expect(html).toContain('Sat 10 Oct, 17:00 GMT+8');
    expect(html).not.toContain('Practice 2');
    expect(html).not.toContain('Practice 3');
    expect(html).not.toContain('To be confirmed');
  });

  it('keeps all three practice sessions on a standard weekend', () => {
    const html = renderToStaticMarkup(
      <RaceWriteupWeekendSchedule
        race={{
          fp1StartAt: 1,
          fp2StartAt: 2,
          fp3StartAt: 3,
          qualiStartAt: 4,
          raceStartAt: 5,
        }}
        timeZone="UTC"
        timeZoneLabel="TRACK TIME"
      />,
    );

    expect(html).toContain('Practice 1');
    expect(html).toContain('Practice 2');
    expect(html).toContain('Practice 3');
    expect(html).not.toContain('Sprint Qualifying');
  });

  it('server-renders track time only, so a cached page carries nobody’s zone', () => {
    const html = renderToStaticMarkup(
      <RaceWriteupWeekendSchedule
        race={{ raceStartAt: Date.parse('2026-09-13T13:00:00Z') }}
        timeZone="Europe/Madrid"
        timeZoneLabel="MADRID TIME"
      />,
    );

    expect(html).toContain('Sun 13 Sept, 15:00 CEST');
    // The toggle is in the cached markup, because taking up its width only
    // after hydration would shift the whole card. What is not in the markup is
    // any reader's zone: track time is what the server can honestly render.
    expect(html).toContain('My time');
    expect(html).not.toContain(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });

  describe('after hydration', () => {
    let container: HTMLDivElement | null = null;
    let root: Root | null = null;

    afterEach(() => {
      act(() => root?.unmount());
      container?.remove();
      container = null;
      root = null;
      resetSessionTimeView();
    });

    function render(timeZone: string) {
      container = document.createElement('div');
      document.body.append(container);
      root = createRoot(container);
      act(() =>
        root!.render(
          <RaceWriteupWeekendSchedule
            race={{ raceStartAt: Date.parse('2026-09-13T13:00:00Z') }}
            timeZone={timeZone}
            timeZoneLabel="TRACK TIME"
          />,
        ),
      );
      return container!;
    }

    it('re-reads the schedule in the viewer’s zone on request', () => {
      const el = render(FOREIGN_ZONE);
      function raceTime() {
        return [...el.querySelectorAll('dd')].at(-1)?.textContent;
      }
      const trackTime = raceTime();

      const myTime = [...el.querySelectorAll('button')].find(
        (button) => button.textContent === 'My time',
      );
      expect(myTime).toBeDefined();
      act(() => myTime!.click());

      expect(raceTime()).not.toBe(trackTime);
      expect(el.textContent).not.toContain('TRACK TIME');
    });

    it('offers no toggle to a reader already in the track’s zone', () => {
      const el = render(DEVICE_ZONE);
      expect(el.querySelector('button')).toBeNull();
      expect(el.textContent).toContain('TRACK TIME');
    });
  });
});
