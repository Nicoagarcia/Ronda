import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/errors';
import { deleteAccount } from '@/services/auth';

const CONFIRMATION = 'ELIMINAR';

export default function DeleteAccountScreen() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteAccount(text);
      // Sin sesión, el portero vuelve a la bienvenida.
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title="Eliminar cuenta" />
      <View className="gap-2 rounded-2xl bg-red-50 p-4">
        <Text className="font-semibold text-danger">Esto no se puede deshacer.</Text>
        <Text>• Se borran tu perfil, tu foto y tus intereses.</Text>
        <Text>• Los grupos que creaste se eliminan y tus planes se cancelan.</Text>
        <Text>• Tus mensajes quedan como &quot;Usuario eliminado&quot;.</Text>
      </View>
      <TextField
        label={`Para confirmar, escribí ${CONFIRMATION}`}
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Eliminar mi cuenta" variant="danger" disabled={text !== CONFIRMATION} loading={loading} onPress={submit} />
    </Screen>
  );
}
