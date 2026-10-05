import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';

type Props = { label: string; selected?: boolean; onPress?: () => void; disabled?: boolean };

export function Chip({ label, selected, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : undefined}
      accessibilityState={{ checked: selected, disabled }}
      onPress={onPress}
      disabled={disabled || !onPress}
      className={`rounded-full border px-3 py-2 ${selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'} ${disabled ? 'opacity-40' : ''}`}>
      <Text className={selected ? 'font-medium text-brand-700' : 'text-ink'}>{label}</Text>
    </Pressable>
  );
}
