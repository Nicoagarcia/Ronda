import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { coverColor, useCategory } from '@/features/groups/categories';
import { formatPlanWhen } from '@/lib/dates';
import type { PersonPreview, PlanStatus } from '@/services/plans';

type Props = {
  id: string;
  title: string;
  categoryId: number;
  startsAt: string;
  placeName: string;
  zone?: string | null;
  isPrivatePlace?: boolean;
  participantCount: number;
  maxParticipants: number;
  groupName?: string | null;
  status?: PlanStatus;
  amParticipant?: boolean;
  isCreator?: boolean;
  preview?: PersonPreview[];
};

const STATUS_LABEL: Partial<Record<PlanStatus, string>> = { ongoing: 'En curso', finished: 'Terminado', cancelled: 'Cancelado' };

function Tag({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'brand' | 'danger' }) {
  const colors = { muted: 'bg-line text-muted', brand: 'bg-brand-100 text-brand-700', danger: 'bg-red-100 text-danger' }[tone];
  return <Text className={`overflow-hidden rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>{label}</Text>;
}

export function PlanCard(props: Props) {
  const category = useCategory(props.categoryId);
  const isFull = props.participantCount >= props.maxParticipants;
  const status = props.status ?? 'upcoming';
  // En un domicilio, fuera del plan solo se muestra la zona (spec 03).
  const where = props.isPrivatePlace ? `🏠 Domicilio${props.zone ? ` · ${props.zone}` : ''}` : `📍 ${props.placeName}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/plan/${props.id}`)}
      className={`flex-row gap-3 rounded-2xl border border-line bg-surface p-3 active:opacity-70 ${status === 'cancelled' ? 'opacity-60' : ''}`}>
      <View style={{ backgroundColor: coverColor(props.categoryId) }} className="h-16 w-16 items-center justify-center rounded-xl">
        <Text className="text-3xl">{category?.emoji ?? '🗓️'}</Text>
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semibold" numberOfLines={1}>
          {props.title}
        </Text>
        <Text className="text-sm font-medium text-brand-700">{formatPlanWhen(props.startsAt)}</Text>
        <Text variant="muted" numberOfLines={1}>
          {where}
        </Text>
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text variant="muted">
            👥 {props.participantCount}/{props.maxParticipants}
          </Text>
          {props.groupName ? <Tag label={props.groupName} /> : null}
          {STATUS_LABEL[status] ? <Tag label={STATUS_LABEL[status]!} tone={status === 'cancelled' ? 'danger' : 'muted'} /> : null}
          {status === 'upcoming' && isFull && !props.amParticipant ? <Tag label="Completo" tone="danger" /> : null}
          {props.isCreator ? <Tag label="Lo creaste" tone="brand" /> : props.amParticipant ? <Tag label="Vas" tone="brand" /> : null}
        </View>
      </View>
      {props.preview?.length ? (
        <View className="flex-row self-center">
          {props.preview.map((p, i) => (
            <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -10 }} className="rounded-full border-2 border-surface">
              <Avatar uri={p.avatar_url} name={p.name} size={28} />
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
