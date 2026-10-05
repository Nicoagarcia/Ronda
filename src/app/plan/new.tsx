import { router, useLocalSearchParams } from 'expo-router';

import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useGroup } from '@/features/groups/hooks';
import { PlanForm } from '@/features/plans/components/plan-form';
import { useCreatePlan } from '@/features/plans/hooks';
import { errorMessage } from '@/lib/errors';

// Plan independiente, o dentro de un grupo si viene ?groupId=…
export default function NewPlanScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const group = useGroup(groupId ?? '', !!groupId);
  const create = useCreatePlan();

  const groupData = groupId && group.data && !('banned' in group.data) ? group.data : null;
  if (groupId && !groupData) return null;

  return (
    <Screen scroll>
      <Header title="Nuevo plan" />
      {groupData ? <Text variant="muted">En el grupo {groupData.name}</Text> : null}
      <PlanForm
        groupAccess={groupData?.access ?? null}
        submitLabel="Crear plan"
        loading={create.isPending}
        error={create.error ? errorMessage(create.error) : null}
        onSubmit={(input) =>
          create.mutate({ input, groupId: groupId ?? null }, { onSuccess: (id) => router.replace(`/plan/${id}`) })
        }
      />
    </Screen>
  );
}
