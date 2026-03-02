import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface FaqSectionProps {
  title: string;
  children: ReactNode;
}

export function FaqSection({ title, children }: FaqSectionProps) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-center gap-2">
        <HelpCircle className="h-6 w-6 text-accent" aria-hidden="true" />
        <h2 className="text-center text-2xl font-bold text-text">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface FaqItemProps {
  icon: LucideIcon;
  question: string;
  children: ReactNode;
}

export function FaqItem({ icon: Icon, question, children }: FaqItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-border bg-surface p-6"
    >
      <h3 className="mb-3 flex items-center gap-3 text-lg font-semibold text-text">
        <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        {question}
      </h3>
      <div className="pl-8">{children}</div>
    </motion.div>
  );
}
