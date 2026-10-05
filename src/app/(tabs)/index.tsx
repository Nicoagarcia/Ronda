import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function DiscoverScreen() {
  return (
    <Screen>
      <Text variant="title">Descubrir</Text>
      <EmptyState emoji="🧭" title="Planes y grupos de La Plata" description="Llega en los hitos 2 y 3." />
    </Screen>
  );
}
