import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDecideRequest, useGroup, useGroupRequests } from '@/features/groups/hooks';
import { errorMessage } from '@/lib/errors';

// Solicitudes pendientes, de la más vieja a la más nueva, con la bio para decidir (AC-17).
export default function GroupRequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group } = useGroup(id);
  const { data: requests } = useGroupRequests(id);
  const decide = useDecideRequest(id);

  const isFull = !!group && !('banned' in group) && group.is_full;

  return (
    <Screen>
      <Header title="Solicitudes" />
      {isFull ? (
        <Text variant="muted">El grupo está completo: para aceptar a alguien tiene que liberarse un lugar.</Text>
      ) : null}
      <ErrorText>{decide.error ? errorMessage(decide.error) : null}</ErrorText>
      <FlatList
        data={requests ?? []}
        keyExtractor={(r) => r.user_id}
        contentContainerClassName="gap-3 grow"
        ListEmptyComponent={<EmptyState emoji="📭" title="No hay solicitudes pendientes" />}
        renderItem={({ item }) => (
          <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
            <Pressable accessibilityRole="button" onPress={() => router.push(`/user/${item.user_id}`)} className="flex-row items-center gap-3">
              <Avatar uri={item.avatar_url} name={item.name} size={48} />
              <View className="flex-1">
                <Text className="font-semibold">
                  {item.name}, {item.age}
                </Text>
                <Text variant="muted">Pidió el {new Date(item.requested_at).toLocaleDateString('es-AR')}</Text>
              </View>
            </Pressable>
            {item.bio ? <Text>{item.bio}</Text> : null}
            <View className="flex-row gap-2">
              <Button
                title="Rechazar"
                variant="ghost"
                className="flex-1"
                disabled={decide.isPending}
                onPress={() => decide.mutate({ userId: item.user_id, accept: false })}
              />
              <Button
                title="Aceptar"
                className="flex-1"
                disabled={isFull || decide.isPending}
                onPress={() => decide.mutate({ userId: item.user_id, accept: true })}
              />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
