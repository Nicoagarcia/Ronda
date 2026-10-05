import { View } from 'react-native';

import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

// Normas de la comunidad (spec 06). Texto corto y simple.
const RULES = [
  { emoji: '🤝', title: 'Respeto siempre', text: 'Nada de insultos, acoso, discriminación ni amenazas. Tratá a los demás como querés que te traten.' },
  { emoji: '🔞', title: 'Solo mayores de 18', text: 'Ronda es para personas adultas. Si alguien parece menor, reportalo.' },
  { emoji: '🚫', title: 'Nada de contenido sexual', text: 'Ronda no es una app de citas. No se permite contenido sexual ni insinuaciones no deseadas.' },
  { emoji: '📢', title: 'Nada de spam ni ventas', text: 'Los grupos y planes son para juntarse, no para vender ni hacer publicidad.' },
  { emoji: '📍', title: 'Encuentros en lugares públicos', text: 'Para conocer gente nueva, elegí lugares públicos y avisale a alguien a dónde vas.' },
  { emoji: '🙋', title: 'Si algo no está bien, reportalo', text: 'Desde un perfil, un grupo, un plan o un mensaje. Es anónimo y lo revisamos en menos de 24 horas.' },
];

export default function RulesScreen() {
  return (
    <Screen scroll>
      <Header title="Normas de la comunidad" />
      <Text>Ronda funciona si todos nos cuidamos. Quien no respete estas normas puede ser advertido o suspendido.</Text>
      {RULES.map((r) => (
        <View key={r.title} className="flex-row gap-3 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-2xl">{r.emoji}</Text>
          <View className="flex-1 gap-1">
            <Text className="font-semibold">{r.title}</Text>
            <Text variant="muted">{r.text}</Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}
