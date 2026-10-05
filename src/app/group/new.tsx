import { router } from 'expo-router';

import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { GroupForm } from '@/features/groups/components/group-form';
import { useCreateGroup } from '@/features/groups/hooks';
import { errorMessage } from '@/lib/errors';

export default function NewGroupScreen() {
  const create = useCreateGroup();

  return (
    <Screen scroll>
      <Header title="Nuevo grupo" />
      <GroupForm
        submitLabel="Crear grupo"
        loading={create.isPending}
        error={create.error ? errorMessage(create.error) : null}
        onSubmit={({ imageUri, ...input }) =>
          create.mutate({ input, imageUri }, { onSuccess: (id) => router.replace(`/group/${id}`) })
        }
      />
    </Screen>
  );
}
