import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, className, ...props }: Props) {
  return (
    <View className={`gap-1.5 ${className ?? ''}`}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor="#a8a29e"
        className={`h-12 rounded-xl border bg-surface px-4 text-base text-ink ${error ? 'border-danger' : 'border-line focus:border-brand-500'}`}
        {...props}
      />
      {error ? (
        <Text variant="muted" className="text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="muted">{hint}</Text>
      ) : null}
    </View>
  );
}
