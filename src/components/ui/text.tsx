import { Text as RNText, type TextProps } from 'react-native';

const variants = {
  title: 'text-2xl font-bold text-ink',
  subtitle: 'text-lg font-semibold text-ink',
  body: 'text-base text-ink',
  muted: 'text-sm text-muted',
  label: 'text-sm font-medium text-ink',
} as const;

type Props = TextProps & { variant?: keyof typeof variants };

export function Text({ variant = 'body', className, ...props }: Props) {
  return <RNText className={`${variants[variant]} ${className ?? ''}`} {...props} />;
}
