import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useCancelPlan } from '@/features/plans/hooks';
import { errorMessage } from '@/lib/errors';

// Cancelar con motivo opcional, que se publica en el chat del plan (spec 03, AC-28; chat en el Hito 4).
export default function CancelPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cancel = useCancelPlan(id);
  const [reason, setReason] = useState('');

  return (
    <Screen scroll>
      <Header title="Cancelar plan" />
      <Text>Le vamos a avisar a quienes se sumaron. El plan deja de aparecer en Descubrir.</Text>
      <TextField
        label="Motivo (opcional)"
        value={reason}
        onChangeText={setReason}
        maxLength={300}
        placeholder="Llueve, me surgió algo…"
        multiline
        style={{ height: 90, textAlignVertical: 'top', paddingTop: 12 }}
      />
      <ErrorText>{cancel.error ? errorMessage(cancel.error) : null}</ErrorText>
      <Button
        title="Cancelar plan"
        variant="danger"
        loading={cancel.isPending}
        onPress={() => cancel.mutate(reason.trim() || null, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
