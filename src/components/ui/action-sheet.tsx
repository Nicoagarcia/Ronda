import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

export type SheetAction = { label: string; onPress: () => void; danger?: boolean };

type Props = { visible: boolean; title?: string; actions: SheetAction[]; onClose: () => void };

// Menú de opciones desde abajo (Android limita Alert a 3 botones).
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <View className="rounded-t-3xl bg-surface px-4 pb-10 pt-3">
          {title ? (
            <Text variant="muted" className="py-2 text-center" numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                a.onPress();
              }}
              className="border-b border-line py-4 active:opacity-60">
              <Text className={`text-center text-lg ${a.danger ? 'text-danger' : ''}`}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={onClose} className="py-4 active:opacity-60">
            <Text className="text-center text-lg font-semibold">Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
