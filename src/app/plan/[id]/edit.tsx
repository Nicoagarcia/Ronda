import { router, useLocalSearchParams } from 'expo-router';

import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { PlanForm } from '@/features/plans/components/plan-form';
import { usePlan, useUpdatePlan } from '@/features/plans/hooks';
import { errorMessage } from '@/lib/errors';

export default function EditPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan } = usePlan(id);
  const update = useUpdatePlan(id);

  if (!plan) return null;

  return (
    <Screen scroll>
      <Header title="Editar plan" />
      <Text variant="muted">Si cambiás el día, la hora o el lugar, avisamos a quienes van.</Text>
      <PlanForm
        groupAccess={plan.group?.access ?? null}
        submitLabel="Guardar cambios"
        initial={{
          title: plan.title,
          description: plan.description,
          categoryId: plan.category_id,
          placeName: plan.place_name,
          zone: plan.zone,
          isPrivatePlace: plan.is_private_place,
          address: plan.address,
          startsAt: new Date(plan.starts_at),
          endsAt: plan.ends_at ? new Date(plan.ends_at) : null,
          maxParticipants: plan.max_participants,
        }}
        loading={update.isPending}
        error={update.error ? errorMessage(update.error) : null}
        onSubmit={(input) => update.mutate(input, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
