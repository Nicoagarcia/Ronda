import { router } from 'expo-router';
import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAckWarning, useMyWarning } from '@/features/moderation/hooks';

// Advertencia del moderador: se muestra una vez al abrir la app (spec 06, AC-25).
export function WarningModal() {
  const { data: warning } = useMyWarning();
  const ack = useAckWarning();
  if (!warning) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full gap-4 rounded-3xl bg-surface p-6">
          <Text className="text-4xl">⚠️</Text>
          <Text variant="title">Recibiste una advertencia</Text>
          <Text>Motivo: {warning.reason}</Text>
          <Text variant="muted">Si se repite, tu cuenta puede ser suspendida.</Text>
          <Button
            title="Ver las normas"
            variant="secondary"
            onPress={() => ack.mutate(warning.id, { onSuccess: () => router.push('/settings/rules') })}
          />
          <Button title="Entendido" loading={ack.isPending} onPress={() => ack.mutate(warning.id)} />
        </View>
      </View>
    </Modal>
  );
}
