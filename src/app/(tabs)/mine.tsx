import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { GroupCard } from '@/features/groups/components/group-card';
import { useMyGroups } from '@/features/groups/hooks';
import { PlanCard } from '@/features/plans/components/plan-card';
import { useMyPlans } from '@/features/plans/hooks';

type Tab = 'plans' | 'groups';

export default function MineScreen() {
  const [tab, setTab] = useState<Tab>('plans');
  return (
    <Screen>
      <Text variant="title">Lo mío</Text>
      <Segmented
        options={[
          { value: 'plans', label: 'Planes' },
          { value: 'groups', label: 'Grupos' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'plans' ? <MyPlans /> : <MyGroups />}
    </Screen>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text variant="label" className="pt-2">
      {title}
    </Text>
  );
}

// Próximos (incluye los que están en curso) y pasados (incluye cancelados), spec 03.
function MyPlans() {
  const { data, isPending, isRefetching, refetch } = useMyPlans();
  const plans = data ?? [];
  const sections = [
    { title: 'Próximos', data: plans.filter((p) => p.status === 'upcoming' || p.status === 'ongoing') },
    { title: 'Pasados', data: plans.filter((p) => p.status === 'finished' || p.status === 'cancelled').reverse() },
  ].filter((s) => s.data.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(p) => p.id}
      contentContainerClassName="gap-3 grow pb-4"
      refreshing={isRefetching}
      onRefresh={refetch}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <SectionTitle title={section.title} />}
      renderItem={({ item }) => (
        <PlanCard
          id={item.id}
          title={item.title}
          categoryId={item.category_id}
          startsAt={item.starts_at}
          placeName={item.place_name}
          zone={item.zone}
          participantCount={item.participant_count}
          maxParticipants={item.max_participants}
          groupName={item.group_name}
          status={item.status}
          amParticipant
          isCreator={item.is_creator}
        />
      )}
      ListEmptyComponent={
        isPending ? null : (
          <EmptyState emoji="🗓️" title="Todavía no tenés planes" description="Sumate a uno o armá el tuyo.">
            <Button title="Ver planes" className="mt-3" onPress={() => router.push('/')} />
          </EmptyState>
        )
      }
    />
  );
}

function MyGroups() {
  const { data, isPending, isRefetching, refetch } = useMyGroups();
  const groups = data ?? [];
  const sections = [
    { title: 'Mis grupos', data: groups.filter((g) => g.my_status === 'active') },
    { title: 'Solicitudes enviadas', data: groups.filter((g) => g.my_status === 'pending') },
  ].filter((s) => s.data.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(g) => g.id}
      contentContainerClassName="gap-3 grow pb-4"
      refreshing={isRefetching}
      onRefresh={refetch}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <SectionTitle title={section.title} />}
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
  );
}
