import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type Props = { visible: boolean; onAccept: () => void; onCancel: () => void; loading?: boolean };

// Aviso que se acepta la primera vez que alguien se suma a un plan (spec 03, AC-15).
export function SafetyNotice({ visible, onAccept, onCancel, loading }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="gap-4 rounded-t-3xl bg-surface p-6 pb-10">
          <Text className="text-4xl">🛟</Text>
          <Text variant="title">Antes de tu primer plan</Text>
          <View className="gap-2">
            <Text>• Encontrate en lugares públicos.</Text>
            <Text>• Avisale a alguien a dónde vas y con quién.</Text>
            <Text>• Si algo no te cierra, no vayas y reportalo.</Text>
          </View>
          <Button title="Entendido, me sumo" onPress={onAccept} loading={loading} />
          <Button title="Ahora no" variant="ghost" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
