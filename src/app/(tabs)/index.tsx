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
import { PlanCard } from '@/features/plans/components/plan-card';
import { useDiscoverPlans } from '@/features/plans/hooks';
import { useDebouncedValue } from '@/lib/use-debounced-value';

type Tab = 'plans' | 'groups';

export default function DiscoverScreen() {
  const [tab, setTab] = useState<Tab>('plans');

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
      {tab === 'groups' ? <DiscoverGroups /> : <DiscoverPlans />}
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
      <SearchBox value={search} onChange={setSearch} placeholder="Buscar grupos" />
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

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#a8a29e"
      className="h-11 rounded-xl border border-line bg-surface px-4 text-base text-ink"
      returnKeyType="search"
    />
  );
}

function DiscoverPlans() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isPending, isRefetching, refetch } = useDiscoverPlans(categoryId, debouncedSearch);

  return (
    <View className="flex-1 gap-3">
      <SearchBox value={search} onChange={setSearch} placeholder="Buscar planes" />
      <CategoryFilter selected={categoryId} onChange={setCategoryId} />
      <FlatList
        data={data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerClassName="gap-3 grow pb-4"
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <PlanCard
            id={item.id}
            title={item.title}
            categoryId={item.category_id}
            startsAt={item.starts_at}
            placeName={item.place_name}
            zone={item.zone}
            isPrivatePlace={item.is_private_place}
            participantCount={item.participant_count}
            maxParticipants={item.max_participants}
            groupName={item.group_name}
            amParticipant={item.am_participant}
            preview={item.preview as { id: string; name: string; avatar_url: string }[]}
          />
        )}
        ListEmptyComponent={
          isPending ? null : (
            <EmptyState
              emoji="🗓️"
              title={search || categoryId ? 'No encontramos planes' : 'No hay planes próximos en tu ciudad'}
              description="Armá uno y que se sume la gente.">
              <Button title="Crear un plan" className="mt-3" onPress={() => router.push('/plan/new')} />
            </EmptyState>
          )
        }
      />
    </View>
  );
}
