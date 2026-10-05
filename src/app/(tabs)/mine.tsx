import { router } from 'expo-router';
import { SectionList } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { GroupCard } from '@/features/groups/components/group-card';
import { useMyGroups } from '@/features/groups/hooks';

export default function MineScreen() {
  const { data, isPending, isRefetching, refetch } = useMyGroups();
  const groups = data ?? [];

  const sections = [
    { title: 'Mis grupos', data: groups.filter((g) => g.my_status === 'active') },
    { title: 'Solicitudes enviadas', data: groups.filter((g) => g.my_status === 'pending') },
  ].filter((s) => s.data.length > 0);

  return (
    <Screen>
      <Text variant="title">Lo mío</Text>
      <SectionList
        sections={sections}
        keyExtractor={(g) => g.id}
        contentContainerClassName="gap-3 grow pb-4"
        refreshing={isRefetching}
        onRefresh={refetch}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="label" className="pt-2">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <GroupCard
            id={item.id}
            name={item.name}
            imageUrl={item.image_url}
            categoryId={item.category_id}
            memberCount={item.member_count}
            maxMembers={item.max_members}
            myStatus={item.my_status}
            isOwner={item.my_role === 'owner'}
            pendingCount={item.pending_count}
          />
        )}
        ListEmptyComponent={
          isPending ? null : (
            <EmptyState emoji="👥" title="Todavía no estás en ningún grupo" description="Buscá uno que te guste o creá el tuyo.">
              <Button title="Descubrir grupos" className="mt-3" onPress={() => router.push('/')} />
            </EmptyState>
          )
        }
      />
    </Screen>
  );
}
