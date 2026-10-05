import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { CategoryFilter } from '@/features/groups/components/category-filter';
import { GroupCard } from '@/features/groups/components/group-card';
import { useDiscoverGroups } from '@/features/groups/hooks';
import { useDebouncedValue } from '@/lib/use-debounced-value';

type Tab = 'plans' | 'groups';

export default function DiscoverScreen() {
  const [tab, setTab] = useState<Tab>('groups');

  return (
    <Screen>
      <Text variant="title">Descubrir</Text>
      <Segmented
        options={[
          { value: 'plans', label: 'Planes' },
          { value: 'groups', label: 'Grupos' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'groups' ? (
        <DiscoverGroups />
      ) : (
        <EmptyState emoji="🗓️" title="Los planes llegan en el Hito 3" />
      )}
    </Screen>
  );
}

function DiscoverGroups() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isPending, isRefetching, refetch } = useDiscoverGroups(categoryId, debouncedSearch);

  return (
    <View className="flex-1 gap-3">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar grupos"
        placeholderTextColor="#a8a29e"
        className="h-11 rounded-xl border border-line bg-surface px-4 text-base text-ink"
        returnKeyType="search"
      />
      <CategoryFilter selected={categoryId} onChange={setCategoryId} />
      <FlatList
        data={data ?? []}
        keyExtractor={(g) => g.id}
        contentContainerClassName="gap-3 grow pb-4"
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <GroupCard
            id={item.id}
            name={item.name}
            imageUrl={item.image_url}
            categoryId={item.category_id}
            zone={item.zone}
            access={item.access}
            memberCount={item.member_count}
            maxMembers={item.max_members}
            myStatus={item.my_status}
          />
        )}
        ListEmptyComponent={
          isPending ? null : (
            <EmptyState
              emoji="🌱"
              title={search || categoryId ? 'No encontramos grupos' : 'Todavía no hay grupos en tu ciudad'}
              description="¿Por qué no armás el primero?">
              <Button title="Crear un grupo" className="mt-3" onPress={() => router.push('/group/new')} />
            </EmptyState>
          )
        }
      />
    </View>
  );
}
