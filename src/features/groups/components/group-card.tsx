import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useCategory } from '@/features/groups/categories';
import { GroupCover } from '@/features/groups/components/group-cover';
import type { GroupAccess, MemberStatus } from '@/services/groups';

type Props = {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryId: number;
  zone?: string | null;
  access?: GroupAccess;
  memberCount: number;
  maxMembers: number;
  myStatus?: MemberStatus | null;
  isOwner?: boolean;
  pendingCount?: number | null;
};

function Tag({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'brand' | 'danger' }) {
  const colors = { muted: 'bg-line text-muted', brand: 'bg-brand-100 text-brand-700', danger: 'bg-red-100 text-danger' }[tone];
  return <Text className={`overflow-hidden rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>{label}</Text>;
}

export function GroupCard(props: Props) {
  const category = useCategory(props.categoryId);
  const isFull = props.memberCount >= props.maxMembers;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/group/${props.id}`)}
      className="flex-row gap-3 rounded-2xl border border-line bg-surface p-3 active:opacity-70">
      <GroupCover imageUrl={props.imageUrl} categoryId={props.categoryId} size={64} rounded={12} />
      <View className="flex-1 gap-1">
        <Text className="font-semibold" numberOfLines={1}>
          {props.name}
        </Text>
        <Text variant="muted" numberOfLines={1}>
          {category ? `${category.emoji} ${category.name}` : ''}
          {props.zone ? ` · ${props.zone}` : ''}
        </Text>
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text variant="muted">
            👥 {props.memberCount}/{props.maxMembers}
          </Text>
          {props.access === 'approval' ? <Tag label="Con aprobación" /> : null}
          {isFull && props.myStatus !== 'active' ? <Tag label="Completo" tone="danger" /> : null}
          {props.isOwner ? <Tag label="Creador" tone="brand" /> : null}
          {props.myStatus === 'pending' ? <Tag label="Solicitud enviada" tone="brand" /> : null}
          {props.myStatus === 'active' && !props.isOwner ? <Tag label="Miembro" tone="brand" /> : null}
          {props.pendingCount ? <Tag label={`${props.pendingCount} solicitud${props.pendingCount > 1 ? 'es' : ''}`} tone="danger" /> : null}
        </View>
      </View>
    </Pressable>
  );
}
