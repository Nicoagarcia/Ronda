import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function MineScreen() {
  return (
    <Screen>
      <Text variant="title">Lo mío</Text>
      <EmptyState emoji="👥" title="Tus grupos, planes y chats" description="Llega en los hitos 2 a 4." />
    </Screen>
  );
}
