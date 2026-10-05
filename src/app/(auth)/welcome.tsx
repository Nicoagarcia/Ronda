import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function WelcomeScreen() {
  return (
    <Screen className="justify-between">
      <View className="flex-1 justify-center gap-3">
        <Text className="text-5xl font-extrabold text-brand-500">Ronda</Text>
        <Text variant="subtitle">Menos matches. Más planes.</Text>
        <Text variant="muted">Encontrá grupos y planes en tu ciudad, y conocé gente haciendo lo que te gusta.</Text>
      </View>
      <View className="gap-3 pb-4">
        {/* El login con Google se habilita cuando esté definido el paquete de Android (Hito 1, pendiente). */}
        <Button title="Continuar con Google (pronto)" variant="secondary" disabled />
        <Button title="Usar email" onPress={() => router.push('/sign-in')} />
      </View>
    </Screen>
  );
}
