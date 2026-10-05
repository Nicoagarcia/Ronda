import { FlatList, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useBlockedUsers, useUnblock } from '@/features/moderation/hooks';

// Spec 06, AC-06: al desbloquear todo vuelve a verse (salvo expulsiones hechas aparte).
export default function BlockedScreen() {
  const { data, isPending } = useBlockedUsers();
  const unblock = useUnblock();

  return (
    <Screen>
      <Header title="Bloqueados" />
      <FlatList
        data={data ?? []}
        keyExtractor={(b) => b.user_id}
        contentContainerClassName="grow"
        ItemSeparatorComponent={() => <View className="h-px bg-line" />}
        ListEmptyComponent={isPending ? null : <EmptyState emoji="🕊️" title="No bloqueaste a nadie" />}
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-3 py-3">
            <Avatar uri={item.avatar_url} name={item.name} size={44} />
            <Text className="flex-1 font-medium">{item.name}</Text>
            <Button
              title="Desbloquear"
              variant="ghost"
              loading={unblock.isPending && unblock.variables === item.user_id}
              onPress={() => unblock.mutate(item.user_id)}
            />
          </View>
        )}
      />
    </Screen>
  );
}
