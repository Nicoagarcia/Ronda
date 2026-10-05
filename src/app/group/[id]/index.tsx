import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useCategory } from '@/features/groups/categories';
import { GroupCover } from '@/features/groups/components/group-cover';
import { useCancelRequest, useGroup, useJoinGroup, useLeaveGroup } from '@/features/groups/hooks';
import { PlanCard } from '@/features/plans/components/plan-card';
import { useGroupPlans } from '@/features/plans/hooks';
import { errorMessage } from '@/lib/errors';
import type { GroupDetail } from '@/services/groups';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, isPending } = useGroup(id);

  if (isPending) return null;

  if (!group) {
    return (
      <Screen>
        <Header />
        <EmptyState emoji="🫥" title="Este grupo no existe" description="Puede que lo hayan eliminado." />
      </Screen>
    );
  }

  if ('banned' in group) {
    return (
      <Screen>
        <Header />
        <EmptyState emoji="🚪" title="Ya no sos parte de este grupo" />
      </Screen>
    );
  }

  return <GroupContent group={group} />;
}

function GroupContent({ group }: { group: GroupDetail }) {
  const category = useCategory(group.category_id);
  const isOwner = group.my_role === 'owner';
  const isMember = group.my_status === 'active';

  return (
    <Screen scroll>
      <Header />
      <GroupCover imageUrl={group.image_url} categoryId={group.category_id} height={180} />
      <View className="gap-1">
        <Text variant="title">{group.name}</Text>
        <Text variant="muted">
          {category ? `${category.emoji} ${category.name}` : ''}
          {group.zone ? ` · ${group.zone}` : ''}
          {` · ${group.access === 'open' ? 'Abierto' : 'Con aprobación'}`}
        </Text>
      </View>

      <MembershipAction group={group} />

      <Text>{group.description}</Text>

      <Pressable
        accessibilityRole="button"
        disabled={!isMember}
        onPress={() => router.push(`/group/${group.id}/members`)}
        className="gap-2 rounded-2xl border border-line bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <Text variant="label">
            👥 {group.member_count}/{group.max_members} miembros
          </Text>
          {isMember ? <Ionicons name="chevron-forward" size={18} color="#a8a29e" /> : null}
        </View>
        <View className="flex-row">
          {group.preview.map((m, i) => (
            <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }} className="rounded-full border-2 border-surface">
              <Avatar uri={m.avatar_url} name={m.name} size={36} />
            </View>
          ))}
        </View>
      </Pressable>

      <GroupPlans group={group} />

      {isOwner ? <OwnerActions group={group} /> : isMember ? <MemberActions group={group} /> : null}
    </Screen>
  );
}

// El botón principal cambia según la relación del usuario con el grupo (spec 02, pantallas).
function MembershipAction({ group }: { group: GroupDetail }) {
  const join = useJoinGroup(group.id);
  const cancel = useCancelRequest(group.id);
  const error = join.error ?? cancel.error;

  let action: React.ReactNode;
  if (group.my_status === 'active') {
    action = <Button title="💬 Chat del grupo" onPress={() => router.push(`/group/${group.id}/chat`)} />;
  } else if (group.my_status === 'pending') {
    action = <Button title="Solicitud enviada · Cancelar" variant="secondary" loading={cancel.isPending} onPress={() => cancel.mutate()} />;
  } else if (group.my_status === 'rejected' && group.rejoin_after && new Date(group.rejoin_after) > new Date()) {
    action = (
      <View className="gap-1">
        <Button title="Solicitud no aceptada" variant="secondary" disabled />
        <Text variant="muted" className="text-center">
          Podés volver a pedir ingreso desde el {new Date(group.rejoin_after).toLocaleDateString('es-AR')}.
        </Text>
      </View>
    );
  } else if (group.is_full) {
    action = <Button title="Completo" variant="secondary" disabled />;
  } else {
    action = (
      <Button title={group.access === 'open' ? 'Unirme' : 'Pedir ingreso'} loading={join.isPending} onPress={() => join.mutate()} />
    );
  }

  return (
    <View className="gap-2">
      {action}
      <ErrorText>{error ? errorMessage(error) : null}</ErrorText>
    </View>
  );
}

function Row({ icon, label, onPress, danger, badge }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean; badge?: number | null }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center gap-3 border-b border-line py-4 active:opacity-60">
      <Ionicons name={icon} size={20} color={danger ? '#dc2626' : '#1c1917'} />
      <Text className={`flex-1 ${danger ? 'text-danger' : ''}`}>{label}</Text>
      {badge ? <Text className="rounded-full bg-brand-500 px-2 text-xs font-bold text-white">{badge}</Text> : null}
    </Pressable>
  );
}

function OwnerActions({ group }: { group: GroupDetail }) {
  return (
    <View>
      <Text variant="label" className="pt-2">
        Administrar
      </Text>
      {group.access === 'approval' || group.pending_count ? (
        <Row icon="person-add-outline" label="Solicitudes" badge={group.pending_count} onPress={() => router.push(`/group/${group.id}/requests`)} />
      ) : null}
      <Row icon="create-outline" label="Editar grupo" onPress={() => router.push(`/group/${group.id}/edit`)} />
      <Row icon="trash-outline" label="Eliminar grupo" danger onPress={() => router.push(`/group/${group.id}/delete`)} />
    </View>
  );
}

function MemberActions({ group }: { group: GroupDetail }) {
  const leave = useLeaveGroup(group.id);

  const confirmLeave = () =>
    Alert.alert('¿Salir del grupo?', 'Vas a dejar de ver el chat y los planes del grupo. Podés volver a unirte después.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => leave.mutate() },
    ]);

  return (
    <View>
      <Row icon="exit-outline" label="Salir del grupo" danger onPress={confirmLeave} />
      <Row icon="flag-outline" label="Reportar grupo" onPress={() => Alert.alert('Próximamente', 'Reportar llega en el Hito 6.')} />
      <ErrorText>{leave.error ? errorMessage(leave.error) : null}</ErrorText>
    </View>
  );
}

// Planes próximos del grupo. Los miembros pueden crear uno nuevo (spec 03).
function GroupPlans({ group }: { group: GroupDetail }) {
  const isMember = group.my_status === 'active';
  // En un grupo con aprobación, solo los miembros ven los planes.
  const canSee = isMember || group.access === 'open';
  const { data: plans } = useGroupPlans(group.id, canSee);

  if (!canSee) return null;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="label">Planes del grupo</Text>
        {isMember ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plan/new', params: { groupId: group.id } })} hitSlop={8}>
            <Text className="font-semibold text-brand-700">+ Crear plan</Text>
          </Pressable>
        ) : null}
      </View>
      {plans?.length ? (
        plans.map((p) => (
          <PlanCard
            key={p.id}
            id={p.id}
            title={p.title}
            categoryId={p.category_id}
            startsAt={p.starts_at}
            placeName={p.place_name}
            zone={p.zone}
            participantCount={p.participant_count}
            maxParticipants={p.max_participants}
            amParticipant={p.am_participant}
          />
        ))
      ) : (
        <Text variant="muted">No hay planes próximos.</Text>
      )}
    </View>
  );
}
