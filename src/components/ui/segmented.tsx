import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

type Props<T extends string> = { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void };

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-xl bg-line p-1">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            className={`flex-1 items-center rounded-lg py-2 ${selected ? 'bg-surface' : ''}`}>
            <Text className={selected ? 'font-semibold' : 'text-muted'}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
