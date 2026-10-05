import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function CreateScreen() {
  return (
    <Screen>
      <Text variant="title">Crear</Text>
      <EmptyState emoji="✨" title="Armá un plan o un grupo" description="Llega en los hitos 2 y 3." />
    </Screen>
  );
}
