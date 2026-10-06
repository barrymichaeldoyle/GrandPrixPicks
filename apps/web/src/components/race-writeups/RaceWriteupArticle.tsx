import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { RaceWriteupActions } from './RaceWriteupActions';

type TocEntry = { id: string; label: string };

/**
 * The hand-written sections of a write-up, with a sticky margin column on
 * wide screens: the section list and the picks action.
 *
 * In September 2026 the median write-up visit scrolled about 60% of the page
 * and the hero button had 2 clicks in 168 visits. Readers spend their time in
 * these sections, and on desktop the prose (`max-w-3xl`) left the right half
 * of the frame empty, so the action follows them down the margin instead of
 * waiting at the top or the foot.
 *
 * `xl` only. A section `aside` floats 12rem into the margin (see
 * `RaceWriteupSection`), which reaches 60rem; at `xl` the frame is 78rem and
 * this 16rem column starts at 62rem. Narrower, the two would overlap.
 *
 * The section list is read from the rendered headings rather than passed in,
 * so it cannot drift from the page. It is a client-side enhancement: the
 * server renders the column with the action only, and the list fills in on
 * mount without moving anything (the column is absolutely positioned).
 */
export function RaceWriteupArticle({
  actions,
  children,
}: {
  /** The rail's action; omit it when the page offers nothing to do. */
  actions?: Omit<ComponentProps<typeof RaceWriteupActions>, 'compact'>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const headings = Array.from(
      root.querySelectorAll<HTMLHeadingElement>('h2[id]'),
    );
    setToc(
      headings.map((heading) => ({
        id: heading.id,
        label: heading.textContent?.trim() ?? heading.id,
      })),
    );
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    // The active entry is the last heading to have passed the upper third of
    // the viewport, so a short section is not skipped while a long one above
    // it is still on screen.
    const observer = new IntersectionObserver(
      () => {
        const line = window.innerHeight / 3;
        let current: string | null = null;
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top <= line) {
            current = heading.id;
          }
        }
        setActiveId(current);
      },
      { rootMargin: '0px 0px -66% 0px', threshold: [0, 1] },
    );
    for (const heading of headings) {
      observer.observe(heading);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative">
      {children}
      <aside
        aria-label="Article sections"
        className="absolute inset-y-0 right-0 hidden w-64 xl:block"
      >
        <div className="sticky top-24 pt-16">
          {toc.length > 1 ? (
            <ol className="border-l border-border text-sm">
              {toc.map((entry) => {
                const active = entry.id === activeId;
                return (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      aria-current={active ? 'location' : undefined}
                      className={`-ml-px block border-l py-1.5 pl-4 leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        active
                          ? 'border-accent text-text'
                          : 'border-transparent text-text-muted hover:text-text'
                      }`}
                    >
                      {entry.label}
                    </a>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {actions ? (
            <div className={toc.length > 1 ? 'mt-6' : undefined}>
              <RaceWriteupActions
                {...actions}
                compact
                placement="race_writeup_rail"
              />
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
