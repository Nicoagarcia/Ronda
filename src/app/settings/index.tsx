import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { signOut } from '@/services/auth';

type RowProps = { label: string; detail?: string; onPress?: () => void; danger?: boolean };

function Row({ label, detail, onPress, danger }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-line py-4 active:opacity-60">
      <Text className={danger ? 'text-danger' : onPress ? '' : 'text-muted'}>{label}</Text>
      <View className="flex-row items-center gap-1">
        {detail ? <Text variant="muted">{detail}</Text> : null}
        {onPress ? <Ionicons name="chevron-forward" size={18} color="#a8a29e" /> : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  return (
    <Screen scroll>
      <Header title="Ajustes" />
      <View>
        <Row label="Notificaciones" onPress={() => router.push('/settings/notifications')} />
        <Row label="Bloqueados" detail="Hito 6" />
        <Row label="Normas de la comunidad" detail="Hito 7" />
        {/* AC-19: el borrado del token de push al cerrar sesión se suma en el Hito 5. */}
        <Row label="Cerrar sesión" onPress={() => signOut()} />
        <Row label="Eliminar cuenta" danger onPress={() => router.push('/settings/delete-account')} />
      </View>
    </Screen>
  );
}
