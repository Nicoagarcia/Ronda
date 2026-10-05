import { Switch, View } from 'react-native';

import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/features/notifications/hooks';
import { errorMessage } from '@/lib/errors';
import type { NotificationSettings } from '@/services/notifications';

type Key = Exclude<keyof NotificationSettings, 'permission_prompted_at'>;

const OPTIONS: { key: Key; title: string; description: string }[] = [
  { key: 'messages', title: 'Mensajes', description: 'Chats de tus grupos y planes' },
  { key: 'requests', title: 'Solicitudes de ingreso', description: 'Cuando alguien pide entrar o te aceptan' },
  { key: 'group_plans', title: 'Planes nuevos en mis grupos', description: 'Cuando alguien arma un plan' },
  { key: 'plan_joins', title: 'Gente que se suma a mis planes', description: 'Cuando alguien se suma a un plan tuyo' },
  { key: 'plan_updates', title: 'Recordatorios y cambios', description: 'Recordatorio 2 h antes, cambios y cancelaciones' },
];

export default function NotificationSettingsScreen() {
  const { data: settings } = useNotificationSettings();
  const update = useUpdateNotificationSettings();

  return (
    <Screen scroll>
      <Header title="Notificaciones" />
      {/* El aviso de permiso del sistema negado llega con la app de desarrollo (Hito 5, parte del celular). */}
      {settings ? (
        <View>
          {OPTIONS.map((o) => (
            <View key={o.key} className="flex-row items-center gap-3 border-b border-line py-4">
              <View className="flex-1 gap-0.5">
                <Text className="font-medium">{o.title}</Text>
                <Text variant="muted">{o.description}</Text>
              </View>
              <Switch
                value={settings[o.key]}
                onValueChange={(value) => update.mutate({ [o.key]: value })}
                trackColor={{ true: '#ff6b3d', false: '#e7e5e4' }}
                thumbColor="#ffffff"
              />
            </View>
          ))}
        </View>
      ) : null}
      <ErrorText>{update.error ? errorMessage(update.error) : null}</ErrorText>
      <Text variant="muted">Si se elimina un grupo del que sos parte, te avisamos siempre.</Text>
    </Screen>
  );
}
