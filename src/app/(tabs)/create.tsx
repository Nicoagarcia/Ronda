import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

function Option({ emoji, title, description, onPress }: { emoji: string; title: string; description: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      className={`flex-row items-center gap-4 rounded-2xl border border-line bg-surface p-5 active:opacity-70 ${onPress ? '' : 'opacity-50'}`}>
      <Text className="text-4xl">{emoji}</Text>
      <View className="flex-1 gap-1">
        <Text variant="subtitle">{title}</Text>
        <Text variant="muted">{description}</Text>
      </View>
    </Pressable>
  );
}

export default function CreateScreen() {
  return (
    <Screen>
      <Text variant="title">Crear</Text>
      <Option emoji="🗓️" title="Un plan" description="Una actividad puntual: patinar el sábado, un café, estudiar juntos. Llega en el Hito 3." />
      <Option emoji="👥" title="Un grupo" description="Una comunidad para juntarse seguido: un deporte, una carrera, un barrio." onPress={() => router.push('/group/new')} />
    </Screen>
  );
}
