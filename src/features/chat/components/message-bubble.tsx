import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { LinkedText } from '@/components/ui/linked-text';
import { Text } from '@/components/ui/text';
import { formatTime } from '@/lib/dates';
import type { ChatMessage } from '@/services/chat';

type Props = {
  message: ChatMessage;
  mine: boolean;
  showSender: boolean;
  onLongPress: () => void;
  onRetry: () => void;
};

function deletedText(m: ChatMessage): string | null {
  if (m.hidden) return 'Mensaje oculto mientras se revisa';
  if (m.deleted_by === 'moderator') return 'Mensaje eliminado por el moderador';
  if (m.deleted_by === 'author') return 'Mensaje eliminado';
  return null;
}

export function MessageBubble({ message, mine, showSender, onLongPress, onRetry }: Props) {
  if (message.kind === 'system') {
    return (
      <View className="items-center px-6 py-1.5">
        <Text variant="muted" className="text-center text-xs">
          {message.body}
        </Text>
      </View>
    );
  }

  const removed = deletedText(message);
  const failed = message.local?.status === 'failed';
  const sending = message.local?.status === 'sending';
  const senderName = message.sender_id ? message.sender_name : 'Usuario eliminado';

  return (
    <View className={`flex-row items-end gap-2 px-3 ${mine ? 'justify-end' : ''} ${showSender ? 'mt-2' : 'mt-0.5'}`}>
      {!mine ? (
        <View style={{ width: 32 }}>
          {showSender ? <Avatar uri={message.sender_avatar} name={senderName} size={32} /> : null}
        </View>
      ) : null}
      <Pressable
        onLongPress={onLongPress}
        onPress={failed ? onRetry : undefined}
        delayLongPress={300}
        className={`max-w-[78%] gap-0.5 rounded-2xl px-3 py-2 ${mine ? 'rounded-br-md bg-brand-500' : 'rounded-bl-md bg-surface'} ${failed ? 'opacity-60' : ''}`}>
        {!mine && showSender ? <Text className="text-xs font-semibold text-brand-700">{senderName}</Text> : null}
        {removed ? (
          <Text className={`italic ${mine ? 'text-white/80' : 'text-muted'}`}>{removed}</Text>
        ) : (
          <LinkedText className={mine ? 'text-white' : 'text-ink'}>{message.body}</LinkedText>
        )}
        <Text className={`self-end text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}>
          {failed ? 'No enviado · Reintentar' : sending ? 'enviando…' : formatTime(message.created_at)}
        </Text>
      </Pressable>
    </View>
  );
}
