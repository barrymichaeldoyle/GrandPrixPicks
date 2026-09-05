import { Plus } from 'lucide-react';

/**
 * One question a reader might type into a search box, answered in the page's
 * own words. Plain strings: the same list feeds the page's FAQPage JSON-LD,
 * which cannot carry markup.
 */
export type RaceFaq = {
  question: string;
  answer: string;
};

/**
 * The "common questions" accordion at the foot of a race write-up.
 *
 * Native `<details>` so a question opens without JavaScript and stays
 * findable by in-page search. The heading id is fixed because every write-up
 * links to it from the same anchor.
 */
export function RaceFaqSection({ faqs }: { faqs: readonly RaceFaq[] }) {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="common-questions">
      <h2
        id="common-questions"
        className="font-title text-2xl font-medium text-text sm:text-3xl"
      >
        Common questions
      </h2>
      <div className="mt-7 grid gap-2">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-sm px-3 open:bg-surface hover:bg-surface sm:px-5"
          >
            <summary className="font-title flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-text marker:content-none">
              {faq.question}
              <Plus
                className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-45"
                aria-hidden
              />
            </summary>
            <p className="gpp-reading-copy max-w-3xl pb-5 text-text-muted">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
