import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useBackendStatus } from '@/features/system/use-backend-status';

export default function ProfileScreen() {
  const status = useBackendStatus();

  return (
    <Screen scroll>
      <Text variant="title">Perfil</Text>

      {/* Solo para el Hito 0: confirma que la app llega a Supabase. Se quita en el Hito 1. */}
      <Card className="gap-3">
        <Text variant="subtitle">Estado del sistema</Text>
        <Text>
          Backend:{' '}
          {status.isPending
            ? 'verificando…'
            : status.data?.ok
              ? '✅ conectado'
              : `❌ ${status.data && !status.data.ok ? status.data.error : 'sin respuesta'}`}
        </Text>
        <Button title="Volver a verificar" variant="secondary" onPress={() => status.refetch()} loading={status.isFetching} />
      </Card>

      <Card className="gap-3">
        <Text variant="subtitle">Componentes base</Text>
        <TextField label="Nombre" placeholder="Cómo te llamás" hint="Entre 2 y 30 caracteres" />
        <TextField label="Con error" placeholder="Ejemplo" error="Este campo es obligatorio" />
        <View className="gap-2">
          <Button title="Primario" />
          <Button title="Secundario" variant="secondary" />
          <Button title="Sin fondo" variant="ghost" />
          <Button title="Peligro" variant="danger" />
        </View>
      </Card>
    </Screen>
  );
}
