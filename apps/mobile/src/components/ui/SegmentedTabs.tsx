import { Pressable, Text, View } from '../../tw';

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  value: T;
  options: ReadonlyArray<SegmentOption<T>>;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <View className="flex-row rounded-full border border-border bg-surface p-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-full py-2 ${
              isActive ? 'bg-button-accent' : 'active:bg-surface-elevated'
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${
                isActive ? 'text-foreground' : 'text-muted'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
