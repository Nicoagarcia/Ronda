import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/text';

const variants = {
  primary: { box: 'bg-brand-500 active:bg-brand-600', text: 'text-white' },
  secondary: { box: 'bg-brand-50 active:bg-brand-100', text: 'text-brand-700' },
  ghost: { box: 'bg-transparent active:bg-line', text: 'text-ink' },
  danger: { box: 'bg-danger active:opacity-80', text: 'text-white' },
} as const;

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: keyof typeof variants;
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading, disabled, className, ...props }: Props) {
  const v = variants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center rounded-xl px-5 ${v.box} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : undefined} />
      ) : (
        <Text className={`font-semibold ${v.text}`}>{title}</Text>
      )}
    </Pressable>
  );
}
