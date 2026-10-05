import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/auth-provider';
import { coverColor, useCategory } from '@/features/groups/categories';
import { usePersonActions } from '@/features/moderation/person-actions';
import { SafetyNotice } from '@/features/plans/components/safety-notice';
import { useJoinPlan, useLeavePlan, usePlan, useRemoveParticipant } from '@/features/plans/hooks';
import { formatPlanWhen, formatTime } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import type { PlanDetail } from '@/services/plans';

const STATUS_TEXT = { ongoing: 'En curso', finished: 'Terminado', cancelled: 'Cancelado' } as const;

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isPending } = usePlan(id);

  if (isPending) return null;
  if (!plan) {
    return (
      <Screen>
        <Header />
        <EmptyState emoji="🫥" title="Este plan no está disponible" />
      </Screen>
    );
  }
  return <PlanContent plan={plan} />;
}

function PlanContent({ plan }: { plan: PlanDetail }) {
  const category = useCategory(plan.category_id);
  const upcoming = plan.status === 'upcoming';

  return (
    <Screen scroll>
      <Header />
      <View className="flex-row items-center gap-4">
        <View style={{ backgroundColor: coverColor(plan.category_id) }} className="h-20 w-20 items-center justify-center rounded-2xl">
          <Text className="text-4xl">{category?.emoji ?? '🗓️'}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text variant="title">{plan.title}</Text>
          {plan.status !== 'upcoming' ? (
            <Text className={plan.status === 'cancelled' ? 'font-semibold text-danger' : 'text-muted'}>{STATUS_TEXT[plan.status]}</Text>
          ) : null}
        </View>
      </View>

      <View className="gap-2 rounded-2xl border border-line bg-surface p-4">
        <Text>
          🗓️ {formatPlanWhen(plan.starts_at)}
          {plan.ends_at ? ` a ${formatTime(plan.ends_at)}` : ''}
        </Text>
        {plan.is_private_place ? (
          <>
            <Text>🏠 {plan.address ? `${plan.place_name} · ${plan.address}` : 'Domicilio particular · la dirección se ve al sumarte'}</Text>
            {plan.zone ? <Text variant="muted">Zona: {plan.zone}</Text> : null}
          </>
        ) : (
          <Text>
            📍 {plan.place_name}
            {plan.zone ? ` · ${plan.zone}` : ''}
          </Text>
        )}
        {category ? (
          <Text>
            {category.emoji} {category.name}
          </Text>
        ) : null}
        {plan.group ? (
          <Pressable accessibilityRole="link" onPress={() => router.push(`/group/${plan.group!.id}`)}>
            <Text className="text-brand-700">👥 Grupo: {plan.group.name}</Text>
          </Pressable>
        ) : null}
      </View>

      {plan.is_private_place ? (
        <View className="rounded-2xl bg-brand-50 p-4">
          <Text>🛟 Es en un domicilio particular. Avisale a alguien a dónde vas y con quién.</Text>
        </View>
      ) : null}

      {plan.status === 'cancelled' && plan.cancel_reason ? (
        <View className="rounded-2xl bg-red-50 p-4">
          <Text>Motivo: {plan.cancel_reason}</Text>
        </View>
      ) : null}

      <PlanAction plan={plan} />

      {plan.description ? <Text>{plan.description}</Text> : null}

      <Participants plan={plan} />

      {plan.is_creator && upcoming ? (
        <View>
          <Text variant="label" className="pt-2">
            Administrar
          </Text>
          <Row icon="create-outline" label="Editar plan" onPress={() => router.push(`/plan/${plan.id}/edit`)} />
          <Row icon="close-circle-outline" label="Cancelar plan" danger onPress={() => router.push(`/plan/${plan.id}/cancel`)} />
        </View>
      ) : null}
      {!plan.is_creator ? (
        <Row
          icon="flag-outline"
          label="Reportar plan"
          onPress={() => router.push({ pathname: '/report', params: { type: 'plan', id: plan.id } })}
        />
      ) : null}
    </Screen>
  );
}

function Row({ icon, label, onPress, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center gap-3 border-b border-line py-4 active:opacity-60">
      <Ionicons name={icon} size={20} color={danger ? '#dc2626' : '#1c1917'} />
      <Text className={`flex-1 ${danger ? 'text-danger' : ''}`}>{label}</Text>
    </Pressable>
  );
}

// Botón principal según el estado del plan y del usuario (spec 03, pantallas).
function PlanAction({ plan }: { plan: PlanDetail }) {
  const join = useJoinPlan(plan.id);
  const leave = useLeavePlan(plan.id);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const upcoming = plan.status === 'upcoming';

  const doJoin = (acceptNotice: boolean) =>
    join.mutate({ acceptNotice }, { onSettled: () => setNoticeVisible(false) });

  const confirmLeave = () =>
    Alert.alert('¿Te bajás del plan?', 'Liberás tu lugar para otra persona.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bajarme', style: 'destructive', onPress: () => leave.mutate() },
    ]);

  let action: React.ReactNode = null;
  if (plan.am_participant) {
    action = (
      <View className="gap-2">
        <Button title="💬 Chat del plan" onPress={() => router.push(`/plan/${plan.id}/chat`)} />
        {upcoming && !plan.is_creator ? <Button title="Bajarme" variant="ghost" loading={leave.isPending} onPress={confirmLeave} /> : null}
      </View>
    );
  } else if (plan.status === 'cancelled') {
    action = <Button title="Cancelado" variant="secondary" disabled />;
  } else if (!upcoming) {
    action = <Button title="Ya no podés sumarte" variant="secondary" disabled />;
  } else if (plan.is_full) {
    action = <Button title="Completo" variant="secondary" disabled />;
  } else {
    action = (
      <Button
        title="Sumarme"
        loading={join.isPending && !noticeVisible}
        onPress={() => (plan.safety_notice_accepted ? doJoin(false) : setNoticeVisible(true))}
      />
    );
  }

  const error = join.error ?? leave.error;
  return (
    <View className="gap-2">
      {action}
      <ErrorText>{error ? errorMessage(error) : null}</ErrorText>
      <SafetyNotice visible={noticeVisible} loading={join.isPending} onAccept={() => doJoin(true)} onCancel={() => setNoticeVisible(false)} />
    </View>
  );
}

function Participants({ plan }: { plan: PlanDetail }) {
  const { session } = useAuth();
  const remove = useRemoveParticipant(plan.id);
  const canRemove = plan.is_creator && plan.status === 'upcoming';

  const confirmRemove = (userId: string, name: string) =>
    Alert.alert(`¿Sacar a ${name} del plan?`, 'No va a poder volver a sumarse a este plan.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sacar', style: 'destructive', onPress: () => remove.mutate(userId, { onError: (e) => Alert.alert('No se pudo', errorMessage(e)) }) },
    ]);

  const personActions = usePersonActions((p) =>
    canRemove && p.id !== plan.creator_id ? [{ label: 'Sacar del plan', danger: true, onPress: () => confirmRemove(p.id, p.name) }] : [],
  );

  return (
    <View className="gap-2">
      <Text variant="label">
        👥 {plan.participant_count}/{plan.max_participants} van
      </Text>
      {plan.participants.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          onPress={() => p.id !== session?.user.id && router.push(`/user/${p.id}`)}
          onLongPress={() => p.id !== session?.user.id && personActions.open({ id: p.id, name: p.name })}
          className="flex-row items-center gap-3 py-1">
          <Avatar uri={p.avatar_url} name={p.name} size={40} />
          <Text className="flex-1">
            {p.name}
            {p.id === plan.creator_id ? <Text variant="muted"> · Organiza</Text> : null}
          </Text>
          {canRemove && p.id !== plan.creator_id ? (
            <Pressable accessibilityRole="button" onPress={() => confirmRemove(p.id, p.name)} hitSlop={8}>
              <Text className="text-danger">Sacar</Text>
            </Pressable>
          ) : null}
        </Pressable>
      ))}
      {personActions.sheet}
    </View>
  );
}
