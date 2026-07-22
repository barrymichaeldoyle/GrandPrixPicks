import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';

interface FaqSectionProps {
  title: string;
  children: ReactNode;
}

export function FaqSection({ title, children }: FaqSectionProps) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <HelpCircle
          className="h-7 w-7 text-accent sm:h-6 sm:w-6"
          aria-hidden="true"
        />
        <h2 className="text-center text-2xl font-bold text-text">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

interface FaqItemProps {
  icon: LucideIcon;
  question: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function FaqItem({
  icon: Icon,
  question,
  children,
  defaultOpen = false,
}: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <h3>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-1 py-4 text-left text-base font-semibold text-text transition-colors hover:bg-surface/45 hover:text-accent sm:gap-3 sm:px-3 sm:py-5 sm:text-lg"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((open) => !open)}
        >
          <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1">{question}</span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={contentId}
        className={`grid transition-[grid-template-rows] duration-250 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="px-1 pb-5 sm:px-3 sm:pl-11">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}
