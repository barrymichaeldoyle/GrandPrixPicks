import { act } from 'react';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { CircuitStatStrip } from './CircuitStatStrip';
import { RaceFaqSection } from './RaceFaqSection';
import { RaceSignalsSection } from './RaceSignalsSection';
import { TyreCompoundScale, TyreCompoundSection } from './TyreCompoundSection';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The shells every race write-up pours its prose into.
 *
 * They exist because five sibling pages had grown five copies of this markup,
 * and the copies had drifted: two pages' FAQ accordions had no disclosure
 * icon and a sub-44px summary while the other three did. These assertions are
 * what keep the answer in one place.
 */
describe('race write-up sections', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(node: ReactNode): HTMLDivElement {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(node));
    return container;
  }

  describe('CircuitStatStrip', () => {
    it('reads each figure as its label’s value', () => {
      const el = render(
        <CircuitStatStrip
          stats={[
            ['6.003', 'km circuit'],
            ['51', 'race laps'],
          ]}
        />,
      );

      // dt names the stat and dd carries the figure, whatever order CSS
      // paints them in.
      expect([...el.querySelectorAll('dt')].map((n) => n.textContent)).toEqual([
        'km circuit',
        'race laps',
      ]);
      expect([...el.querySelectorAll('dd')].map((n) => n.textContent)).toEqual([
        '6.003',
        '51',
      ]);
    });
  });

  describe('RaceSignalsSection', () => {
    const signals = [
      [
        'Braking stability',
        'Lock-ups at Turn 1',
        'A weak front end costs time',
      ],
      ['Wind direction', 'Braking points move', 'References shift lap to lap'],
    ] as const;

    it('renders each signal as a heading and its two explanations', () => {
      const el = render(
        <RaceSignalsSection heading="What matters in Baku" signals={signals}>
          <p>Baku asks for low drag.</p>
        </RaceSignalsSection>,
      );

      expect(el.querySelector('h2')?.textContent).toBe('What matters in Baku');
      expect(el.textContent).toContain('Baku asks for low drag.');
      expect([...el.querySelectorAll('h3')].map((n) => n.textContent)).toEqual([
        'Braking stability',
        'Wind direction',
      ]);
      expect(el.textContent).toContain('A weak front end costs time');
    });

    it('names the section for its heading, so the landmark is labelled', () => {
      const el = render(
        <RaceSignalsSection heading="What matters" signals={signals} />,
      );
      const section = el.querySelector('section');
      expect(section?.getAttribute('aria-labelledby')).toBe('what-to-watch');
      expect(el.querySelector('h2')?.id).toBe('what-to-watch');
    });

    it('omits the figure strip when a page has no figures to give', () => {
      const el = render(
        <RaceSignalsSection heading="What matters" signals={signals} />,
      );
      expect(el.querySelector('dl')).toBeNull();
    });

    it('hides the column headings from assistive tech, not from sighted users', () => {
      const el = render(
        <RaceSignalsSection heading="What matters" signals={signals} />,
      );
      // Each row already reads as a heading plus two paragraphs, so repeating
      // the column names per row would be noise.
      const headings = el.querySelector('[aria-hidden]');
      expect(headings?.textContent).toBe('SignalLook forWhy it matters');
    });
  });

  describe('TyreCompoundScale', () => {
    it('marks the three nominated compounds and leaves the rest at home', () => {
      const el = render(<TyreCompoundScale venue="Baku" hardest="C3" />);
      const cells = [...el.querySelectorAll('li')];

      expect(cells).toHaveLength(5);
      expect(cells.map((c) => c.querySelector('p')?.textContent)).toEqual([
        'C1',
        'C2',
        'C3',
        'C4',
        'C5',
      ]);
      // A nomination is three consecutive compounds, so the hardest names the set.
      expect(cells.map((c) => c.querySelectorAll('p')[1]?.textContent)).toEqual(
        ['Not used at Baku', 'Not used at Baku', 'hard', 'medium', 'soft'],
      );
    });

    it('bands only the nominated compounds, in Pirelli’s sidewall colours', () => {
      const el = render(<TyreCompoundScale venue="Sepang" hardest="C2" />);
      const borders = [...el.querySelectorAll('li')].map(
        (c) => (c as HTMLElement).style.borderTopColor,
      );

      expect(borders[0]).toBe('');
      expect(borders.slice(1, 4)).toEqual([
        'rgb(240, 240, 240)',
        'rgb(255, 213, 0)',
        'rgb(218, 41, 28)',
      ]);
      expect(borders[4]).toBe('');
    });

    it('names the venue for the compounds that stayed at home', () => {
      const el = render(<TyreCompoundScale venue="Monza" hardest="C3" />);
      expect(el.textContent).toContain('Not used at Monza');
    });
  });

  describe('TyreCompoundSection', () => {
    it('wraps the scale in a labelled section with the page’s own analysis', () => {
      const el = render(
        <TyreCompoundSection
          heading="Baku gets the softest three tyres"
          venue="Baku"
          hardest="C3"
        >
          <p>Pirelli selected C3, C4 and C5.</p>
        </TyreCompoundSection>,
      );

      expect(el.querySelector('h2')?.textContent).toBe(
        'Baku gets the softest three tyres',
      );
      expect(el.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
        'tyre-choice',
      );
      expect(el.querySelectorAll('li')).toHaveLength(5);
      expect(el.textContent).toContain('Pirelli selected C3, C4 and C5.');
    });
  });

  describe('RaceFaqSection', () => {
    const faqs = [
      { question: 'When is the race?', answer: 'Sunday 4 October 2026.' },
      {
        question: 'How is it scored?',
        answer: 'Five points for an exact hit.',
      },
    ];

    it('renders every question as a closed disclosure', () => {
      const el = render(<RaceFaqSection faqs={faqs} />);
      const details = [...el.querySelectorAll('details')];

      expect(details).toHaveLength(2);
      expect(details.every((d) => !d.open)).toBe(true);
      expect(
        details.map((d) => d.querySelector('summary')?.textContent),
      ).toEqual(['When is the race?', 'How is it scored?']);
      expect(el.textContent).toContain('Sunday 4 October 2026.');
    });

    it('gives every summary the disclosure icon and a 56px tap target', () => {
      // The affordance two of the five pages were missing before this shell
      // existed. Both are the reason it exists, so both are asserted.
      const el = render(<RaceFaqSection faqs={faqs} />);
      for (const summary of el.querySelectorAll('summary')) {
        expect(summary.className).toContain('min-h-14');
        expect(summary.querySelector('svg')).not.toBeNull();
      }
    });

    it('answers stay plain text, because the same list feeds FAQPage JSON-LD', () => {
      const el = render(<RaceFaqSection faqs={faqs} />);
      for (const p of el.querySelectorAll('details p')) {
        expect(p.children).toHaveLength(0);
      }
    });
  });
});
