import { Text } from '@/components/ui/text';

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <Text variant="muted" className="text-danger" accessibilityRole="alert">
      {children}
    </Text>
  );
}
