import { router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/auth-provider';
import { useGroup, useGroupMembers, useRemoveMember } from '@/features/groups/hooks';
import { usePersonActions } from '@/features/moderation/person-actions';
import { errorMessage } from '@/lib/errors';

export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: group } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const remove = useRemoveMember(id);

  const isOwner = !!group && !('banned' in group) && group.my_role === 'owner';
  const ownerId = group && !('banned' in group) ? group.owner_id : null;

  const confirmRemove = (userId: string, name: string) =>
    Alert.alert(`¿Expulsar a ${name}?`, 'No va a poder volver a unirse ni pedir ingreso a este grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Expulsar',
        style: 'destructive',
        onPress: () => remove.mutate(userId, { onError: (e) => Alert.alert('No se pudo', errorMessage(e)) }),
      },
    ]);

  const personActions = usePersonActions((p) =>
    isOwner && p.id !== ownerId ? [{ label: 'Expulsar del grupo', danger: true, onPress: () => confirmRemove(p.id, p.name) }] : [],
  );

  return (
    <Screen>
      <Header title="Miembros" />
      <FlatList
        data={members ?? []}
        keyExtractor={(m) => m.user_id}
        ItemSeparatorComponent={() => <View className="h-px bg-line" />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => item.user_id !== session?.user.id && router.push(`/user/${item.user_id}`)}
            onLongPress={() => item.user_id !== session?.user.id && personActions.open({ id: item.user_id, name: item.name })}
            className="flex-row items-center gap-3 py-3">
            <Avatar uri={item.avatar_url} name={item.name} size={44} />
            <View className="flex-1">
              <Text className="font-medium">{item.name}</Text>
              {item.role === 'owner' ? <Text variant="muted">Creador</Text> : null}
            </View>
            {isOwner && item.role !== 'owner' ? (
              <Pressable accessibilityRole="button" onPress={() => confirmRemove(item.user_id, item.name)} hitSlop={8}>
                <Text className="text-danger">Expulsar</Text>
              </Pressable>
            ) : null}
          </Pressable>
        )}
      />
      {personActions.sheet}
    </Screen>
  );
}
