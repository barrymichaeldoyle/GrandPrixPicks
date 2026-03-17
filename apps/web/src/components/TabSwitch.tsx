import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './Button';

export type TabSwitchOption<T extends string> = {
  value: T;
  label: ReactNode;
  leftIcon?: LucideIcon;
  disabled?: boolean;
};

interface TabSwitchProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: TabSwitchOption<T>[];
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
}

export function TabSwitch<T extends string>({
  value,
  onChange,
  options,
  className,
  buttonClassName,
  ariaLabel,
}: TabSwitchProps<T>) {
  return (
    <div
      className={className ?? 'flex gap-1'}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant="tab"
          size="tab"
          active={value === option.value}
          onClick={() => onChange(option.value)}
          leftIcon={option.leftIcon}
          disabled={option.disabled}
          className={buttonClassName}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
