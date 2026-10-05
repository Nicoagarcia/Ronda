import { View } from 'react-native';

import { Text } from '@/components/ui/text';

type Props = { emoji: string; title: string; description?: string; children?: React.ReactNode };

export function EmptyState({ emoji, title, description, children }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8">
      <Text className="text-5xl">{emoji}</Text>
      <Text variant="subtitle" className="text-center">
        {title}
      </Text>
      {description ? (
        <Text variant="muted" className="text-center">
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
