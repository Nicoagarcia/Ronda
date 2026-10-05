import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';

import { ActionSheet, type SheetAction } from '@/components/ui/action-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { MessageBubble } from '@/features/chat/components/message-bubble';
import {
  useChatInfo,
  useChatMessages,
  useDeleteMessage,
  useDiscardLocal,
  useMarkRead,
  useSendMessage,
  useSetMuted,
} from '@/features/chat/hooks';
import { useAuth } from '@/features/auth/auth-provider';
import { useBlockFlow } from '@/features/moderation/hooks';
import { arDayKey, dayLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import type { ChatMessage, ChatRef } from '@/services/chat';

const MAX_LENGTH = 2000;

export function ChatScreen({ chat }: { chat: ChatRef }) {
  const { session } = useAuth();
  const me = session?.user.id;
  const info = useChatInfo(chat);
  const { messages, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useChatMessages(chat);
  const { send } = useSendMessage(chat);
  const remove = useDeleteMessage(chat);
  const discard = useDiscardLocal(chat);
  const markRead = useMarkRead(chat);
  const mute = useSetMuted(chat);
  const block = useBlockFlow();
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<ChatMessage | null>(null);

  // Al entrar (y al volver a la pantalla) el chat queda leído (AC-25).
  useFocusEffect(
    useCallback(() => {
      markRead();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat.id]),
  );

  const newest = messages[0]?.id;
  useEffect(() => {
    if (newest) markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);

  if (info.isPending) return null;
  if (!info.data) {
    return (
      <Screen>
        <Header />
        <EmptyState emoji="🔒" title="No tenés acceso a este chat" />
      </Screen>
    );
  }

  const { title, closed_reason, muted, is_moderator } = info.data;
  const detailPath = chat.kind === 'group' ? (`/group/${chat.id}` as const) : (`/plan/${chat.id}` as const);

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const error = await send(body);
    if (error) Alert.alert('No se pudo enviar', errorMessage(error));
  };

  const retry = (m: ChatMessage) => {
    discard(m.id);
    send(m.body);
  };

  const actionsFor = (m: ChatMessage): SheetAction[] => {
    const isDeleted = !!m.deleted_by || m.hidden;
    const list: SheetAction[] = [];
    if (!isDeleted && m.body) list.push({ label: 'Copiar', onPress: () => Clipboard.setStringAsync(m.body) });
    if (!isDeleted && !m.local && (m.sender_id === me || is_moderator)) {
      list.push({
        label: m.sender_id === me ? 'Eliminar' : 'Eliminar (moderador)',
        danger: true,
        onPress: () => remove.mutate(m.id, { onError: (e) => Alert.alert('No se pudo', errorMessage(e)) }),
      });
    }
    if (m.sender_id && m.sender_id !== me && !m.local) {
      const senderId = m.sender_id;
      const senderName = m.sender_name ?? 'esta persona';
      if (!isDeleted) {
        list.push({
          label: 'Reportar mensaje',
          onPress: () => router.push({ pathname: '/report', params: { type: 'message', id: m.id, userId: senderId, name: senderName } }),
        });
      }
      list.push({ label: `Bloquear a ${senderName}`, danger: true, onPress: () => block(senderId, senderName) });
    }
    return list;
  };

  return (
    <Screen padded={false} className="pt-2">
      <View className="px-4 pb-2">
        <Header
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={muted ? 'Activar notificaciones' : 'Silenciar'}
              onPress={() => mute.mutate(!muted)}
              hitSlop={12}>
              <Ionicons name={muted ? 'notifications-off-outline' : 'notifications-outline'} size={22} color="#1c1917" />
            </Pressable>
          }
        />
        <Pressable accessibilityRole="link" onPress={() => router.push(detailPath)}>
          <Text variant="subtitle" numberOfLines={1}>
            {title}
          </Text>
          {muted ? <Text variant="muted">Silenciado</Text> : null}
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-canvas">
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          className="flex-1 bg-line/40"
          contentContainerClassName="py-3"
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="py-3" /> : null}
          ListEmptyComponent={
            isPending ? null : (
              <View className="items-center px-8 py-10" style={{ transform: [{ scaleY: -1 }] }}>
                <Text variant="muted" className="text-center">
                  Todavía no hay mensajes. ¡Escribí el primero!
                </Text>
              </View>
            )
          }
          renderItem={({ item, index }) => {
            // La lista está invertida: el siguiente en el array es el mensaje anterior.
            const older = messages[index + 1];
            const newDay = !older || arDayKey(older.created_at) !== arDayKey(item.created_at);
            const showSender =
              newDay || !older || older.kind === 'system' || older.sender_id !== item.sender_id;
            return (
              <View>
                {newDay ? (
                  <View className="items-center py-2">
                    <Text className="rounded-full bg-surface px-3 py-1 text-xs text-muted">{dayLabel(item.created_at)}</Text>
                  </View>
                ) : null}
                <MessageBubble
                  message={item}
                  mine={item.sender_id === me && item.kind === 'text'}
                  showSender={showSender}
                  onLongPress={() => item.kind === 'text' && setSelected(item)}
                  onRetry={() => retry(item)}
                />
              </View>
            );
          }}
        />

        {closed_reason ? (
          <View className="border-t border-line bg-surface px-4 py-4 pb-8">
            <Text variant="muted" className="text-center">
              {closed_reason}. El chat es de solo lectura.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-end gap-2 border-t border-line bg-surface px-3 py-2 pb-6">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribí un mensaje"
              placeholderTextColor="#a8a29e"
              multiline
              maxLength={MAX_LENGTH}
              className="max-h-32 min-h-11 flex-1 rounded-2xl border border-line bg-canvas px-4 py-2.5 text-base text-ink"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              onPress={submit}
              disabled={!text.trim()}
              className={`h-11 w-11 items-center justify-center rounded-full ${text.trim() ? 'bg-brand-500' : 'bg-line'}`}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      <ActionSheet
        visible={!!selected}
        title={selected?.body}
        actions={selected ? actionsFor(selected) : []}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}
