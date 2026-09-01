import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RaceWriteupWeekendSchedule } from './RaceWriteupWeekendSchedule';

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
});
