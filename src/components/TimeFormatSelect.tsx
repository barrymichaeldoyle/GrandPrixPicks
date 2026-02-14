import { useMemo } from 'react';

import { Button } from './Button';

function getDefaultTimeFormat(): 'en-US' | 'en-GB' {
  if (typeof Intl === 'undefined') {
    return 'en-GB';
  }
  const detected = navigator.language;
  try {
    const hour12 = new Intl.DateTimeFormat(detected, {
      hour: '2-digit',
    }).resolvedOptions().hour12;
    return hour12 ? 'en-US' : 'en-GB';
  } catch {
    return 'en-GB';
  }
}

const TIME_FORMAT_OPTIONS: Array<{ value: 'en-US' | 'en-GB'; label: string }> =
  [
    { value: 'en-US', label: '12-hour' },
    { value: 'en-GB', label: '24-hour' },
  ];

export function TimeFormatSelect({
  value,
  timezone = 'UTC',
  onChange,
}: {
  value?: string;
  timezone?: string;
  onChange: (locale: string | undefined) => void;
}) {
  const defaultFormat = useMemo(() => getDefaultTimeFormat(), []);

  // Map value to our two options (handles legacy locales like de-DE)
  const displayValue = useMemo((): 'en-US' | 'en-GB' => {
    if (!value) {
      return defaultFormat;
    }
    if (value === 'en-US' || value === 'en-GB') {
      return value;
    }
    try {
      const hour12 = new Intl.DateTimeFormat(value, {
        hour: '2-digit',
      }).resolvedOptions().hour12;
      return hour12 ? 'en-US' : 'en-GB';
    } catch {
      return 'en-GB';
    }
  }, [value, defaultFormat]);

  const optionsWithPreview = useMemo(() => {
    const previewDate = new Date();
    return TIME_FORMAT_OPTIONS.map((opt) => {
      try {
        const example = new Intl.DateTimeFormat(opt.value, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: timezone,
        }).format(previewDate);
        return { ...opt, example };
      } catch {
        return { ...opt, example: '--:--' };
      }
    });
  }, [timezone]);

  const handleSelect = (v: 'en-US' | 'en-GB') => {
    onChange(v);
  };

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-text">
        Time format
      </label>
      <div
        className="flex gap-1 rounded-lg border border-border bg-surface p-1"
        role="tablist"
        aria-label="Time format"
      >
        {optionsWithPreview.map((opt) => (
          <Button
            key={opt.value}
            variant="tab"
            size="tab"
            active={displayValue === opt.value}
            onClick={() => handleSelect(opt.value)}
            className="h-8 max-h-8 min-h-8 flex-1"
          >
            {opt.label} · {opt.example}
          </Button>
        ))}
      </div>
    </div>
  );
}
