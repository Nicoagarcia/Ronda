import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

type Props = { title?: string; back?: boolean; right?: React.ReactNode };

export function Header({ title, back = true, right }: Props) {
  return (
    <View className="h-11 flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-2">
        {back && router.canGoBack() ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#1c1917" />
          </Pressable>
        ) : null}
        {title ? <Text variant="subtitle">{title}</Text> : null}
      </View>
      {right}
    </View>
  );
}
