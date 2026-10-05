import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { GroupCover } from '@/features/groups/components/group-cover';
import { dayLabel, formatTime } from '@/lib/dates';
import type { MyChat } from '@/services/chat';

function preview(chat: MyChat, myId?: string): string {
  const m = chat.last_message;
  if (!m) return 'Todavía no hay mensajes';
  if (m.kind === 'system') return m.body;
  if (m.deleted_by) return 'Mensaje eliminado';
  const who = m.sender_id === myId ? 'Vos' : (m.sender_name ?? 'Usuario eliminado');
  return `${who}: ${m.body}`;
}

function when(iso: string): string {
  const label = dayLabel(iso);
  return label === 'Hoy' ? formatTime(iso) : label;
}

export function ChatListItem({ chat, myId }: { chat: MyChat; myId?: string }) {
  const path = chat.group_id ? (`/group/${chat.group_id}/chat` as const) : (`/plan/${chat.plan_id}/chat` as const);
  const unread = chat.unread > 0;

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(path)} className="flex-row items-center gap-3 py-2.5 active:opacity-70">
      <GroupCover imageUrl={chat.image_url} categoryId={chat.category_id} size={52} rounded={chat.group_id ? 14 : 26} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text className={`flex-1 ${unread ? 'font-bold' : 'font-medium'}`} numberOfLines={1}>
            {chat.title}
          </Text>
          <Text variant="muted" className="text-xs">
            {when(chat.last_activity_at)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text variant="muted" numberOfLines={1} className={`flex-1 ${unread ? 'text-ink' : ''}`}>
            {chat.plan_id ? '🗓️ ' : ''}
            {preview(chat, myId)}
          </Text>
          {chat.muted ? <Ionicons name="notifications-off-outline" size={14} color="#a8a29e" /> : null}
          {unread ? (
            <Text className={`min-w-5 overflow-hidden rounded-full px-1.5 text-center text-xs font-bold text-white ${chat.muted ? 'bg-muted' : 'bg-brand-500'}`}>
              {chat.unread > 99 ? '99+' : chat.unread}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
