import { router, useLocalSearchParams } from 'expo-router';

import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { GroupForm } from '@/features/groups/components/group-form';
import { useGroup, useUpdateGroup } from '@/features/groups/hooks';
import { errorMessage } from '@/lib/errors';

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group } = useGroup(id);
  const update = useUpdateGroup(id);

  if (!group || 'banned' in group) return null;

  return (
    <Screen scroll>
      <Header title="Editar grupo" />
      {group.access === 'approval' && group.pending_count ? (
        <Text variant="muted">
          Si lo pasás a abierto, las solicitudes pendientes entran por orden de llegada hasta llenar el cupo.
        </Text>
      ) : null}
      <GroupForm
        submitLabel="Guardar cambios"
        initial={{
          name: group.name,
          description: group.description,
          categoryId: group.category_id,
          zone: group.zone,
          maxMembers: group.max_members,
          access: group.access,
          imageUri: group.image_url,
        }}
        loading={update.isPending}
        error={update.error ? errorMessage(update.error) : null}
        onSubmit={({ imageUri, ...input }) => update.mutate({ input, imageUri }, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
