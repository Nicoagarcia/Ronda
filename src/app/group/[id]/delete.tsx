import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useDeleteGroup, useGroup } from '@/features/groups/hooks';
import { errorMessage } from '@/lib/errors';

// Se confirma escribiendo el nombre exacto del grupo (AC-29).
export default function DeleteGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group } = useGroup(id);
  const remove = useDeleteGroup(id);
  const [text, setText] = useState('');

  if (!group || 'banned' in group) return null;

  return (
    <Screen scroll>
      <Header title="Eliminar grupo" />
      <View className="gap-2 rounded-2xl bg-red-50 p-4">
        <Text className="font-semibold text-danger">Esto no se puede deshacer.</Text>
        <Text>• El grupo y su chat dejan de verse para todos.</Text>
        <Text>• Los planes del grupo que no empezaron se cancelan.</Text>
      </View>
      <TextField label={`Para confirmar, escribí: ${group.name}`} value={text} onChangeText={setText} autoCorrect={false} />
      <ErrorText>{remove.error ? errorMessage(remove.error) : null}</ErrorText>
      <Button
        title="Eliminar grupo"
        variant="danger"
        disabled={text.trim() !== group.name}
        loading={remove.isPending}
        onPress={() => remove.mutate(text, { onSuccess: () => router.dismissTo('/mine') })}
      />
    </Screen>
  );
}
