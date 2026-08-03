import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId, useRef } from 'react';

import { Button } from './Button/Button';

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
  /** Supplying a panel id opts into the complete ARIA tabs pattern. */
  panelId?: string;
  id?: string;
}

export function TabSwitch<T extends string>({
  value,
  onChange,
  options,
  className,
  buttonClassName,
  ariaLabel,
  panelId,
  id,
}: TabSwitchProps<T>) {
  const generatedId = useId().replaceAll(':', '');
  const baseId = id ?? `tab-switch-${generatedId}`;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabMode = panelId !== undefined;

  function optionId(value: T) {
    return `${baseId}-${value.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (!tabMode) {
      return;
    }
    const enabledIndexes = options
      .map((option, optionIndex) => (option.disabled ? -1 : optionIndex))
      .filter((optionIndex) => optionIndex >= 0);
    if (enabledIndexes.length === 0) {
      return;
    }
    const enabledPosition = enabledIndexes.indexOf(index);
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight') {
      nextIndex = enabledIndexes[(enabledPosition + 1) % enabledIndexes.length];
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        enabledIndexes[
          (enabledPosition - 1 + enabledIndexes.length) % enabledIndexes.length
        ];
    } else if (event.key === 'Home') {
      nextIndex = enabledIndexes[0];
    } else if (event.key === 'End') {
      nextIndex = enabledIndexes.at(-1);
    }

    if (nextIndex === undefined) {
      return;
    }
    event.preventDefault();
    const nextOption = options[nextIndex];
    onChange(nextOption.value);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      className={className ?? 'flex gap-1'}
      role={tabMode ? 'tablist' : 'group'}
      aria-label={ariaLabel}
    >
      {options.map((option, index) => (
        <Button
          key={option.value}
          ref={(node) => {
            buttonRefs.current[index] = node;
          }}
          variant="tab"
          size="tab"
          active={value === option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => handleTabKeyDown(event, index)}
          leftIcon={option.leftIcon}
          disabled={option.disabled}
          className={buttonClassName}
          id={tabMode ? optionId(option.value) : undefined}
          role={tabMode ? 'tab' : undefined}
          aria-selected={tabMode ? value === option.value : undefined}
          aria-pressed={tabMode ? undefined : value === option.value}
          aria-controls={tabMode ? panelId : undefined}
          tabIndex={tabMode && value !== option.value ? -1 : 0}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
